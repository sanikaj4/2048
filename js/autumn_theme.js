/**
 * 2048: Autumn Harvest Edition - JavaScript Theme & Effects
 * Features:
 * - Falling Autumn Leaves canvas physics (maple, oak, birch, ginkgo leaves)
 * - Cozy Web Audio API sound effects (wooden slide, melodic merge chimes, win fanfare)
 * - Leaves & Audio toggles with localStorage persistence
 * - Interactive leaf flutter on moves and merges
 */

(function () {
  "use strict";

  // =========================================================================
  // 1. Audio System (Cozy Web Audio API Synthesizer)
  // =========================================================================
  var AutumnAudio = {
    ctx: null,
    enabled: true,

    init: function () {
      var saved = localStorage.getItem("autumn_sound_enabled");
      this.enabled = saved !== null ? saved === "true" : true;
    },

    getContext: function () {
      if (!this.ctx) {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return this.ctx;
    },

    toggle: function () {
      this.enabled = !this.enabled;
      localStorage.setItem("autumn_sound_enabled", this.enabled);
      if (this.enabled) {
        this.playChime(440, 0.1);
      }
      return this.enabled;
    },

    // Soft wooden tap / leaf slide sound
    playSlide: function () {
      if (!this.enabled) return;
      var ctx = this.getContext();
      if (!ctx) return;

      try {
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();

        // Warm woodblock frequency
        osc.type = "sine";
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
      } catch (e) {
        // Audio error handling
      }
    },

    // Melodic chime for tile merges (pitch increases with tile value)
    playMerge: function (tileValue) {
      if (!this.enabled) return;
      var ctx = this.getContext();
      if (!ctx) return;

      try {
        var now = ctx.currentTime;
        // Pentatonic scale base frequencies for autumn chimes
        var scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
        var exponent = Math.max(1, Math.min(scale.length, Math.round(Math.log2(tileValue || 4))));
        var freq = scale[exponent - 1] || 440;

        var osc = ctx.createOscillator();
        var oscHarmonic = ctx.createOscillator();
        var gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        oscHarmonic.type = "sine";
        oscHarmonic.frequency.setValueAtTime(freq * 2, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        oscHarmonic.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        oscHarmonic.start(now);
        osc.stop(now + 0.3);
        oscHarmonic.stop(now + 0.3);
      } catch (e) {
        // Audio error handling
      }
    },

    // Joyful autumn victory celebration arpeggio
    playWin: function () {
      if (!this.enabled) return;
      var ctx = this.getContext();
      if (!ctx) return;

      try {
        var notes = [440, 554.37, 659.25, 880, 1108.73];
        var now = ctx.currentTime;
        notes.forEach(function (freq, i) {
          var startTime = now + (i * 0.1);
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.45);
        });
      } catch (e) {}
    },

    playChime: function (freq, duration) {
      var ctx = this.getContext();
      if (!ctx) return;
      try {
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq || 440, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.02);
      } catch (e) {}
    }
  };

  // =========================================================================
  // 2. Falling Autumn Leaves Canvas Particle System
  // =========================================================================
  var AutumnLeaves = {
    canvas: null,
    ctx: null,
    leaves: [],
    numLeaves: 28,
    animId: null,
    enabled: true,
    wind: 0.2,
    mouseX: 0,
    mouseY: 0,

    leafColors: [
      { fill: "#ea580c", stroke: "#c2410c" }, // Pumpkin Orange
      { fill: "#f59e0b", stroke: "#d97706" }, // Golden Amber
      { fill: "#dc2626", stroke: "#991b1b" }, // Crimson Red
      { fill: "#fbbf24", stroke: "#f59e0b" }, // Warm Gold
      { fill: "#b45309", stroke: "#78350f" }, // Russet Brown
      { fill: "#ef4444", stroke: "#b91c1c" }  // Bright Scarlet
    ],

    init: function () {
      var saved = localStorage.getItem("autumn_leaves_enabled");
      this.enabled = saved !== null ? saved === "true" : true;

      this.canvas = document.getElementById("autumn-leaves-canvas");
      if (!this.canvas) {
        this.canvas = document.createElement("canvas");
        this.canvas.id = "autumn-leaves-canvas";
        document.body.insertBefore(this.canvas, document.body.firstChild);
      }
      this.ctx = this.canvas.getContext("2d");

      this.resize();
      window.addEventListener("resize", this.resize.bind(this));

      // Create leaves
      this.leaves = [];
      for (var i = 0; i < this.numLeaves; i++) {
        this.leaves.push(this.createLeaf(true));
      }

      // Mouse flutter interaction
      var self = this;
      window.addEventListener("mousemove", function (e) {
        self.mouseX = e.clientX;
        self.mouseY = e.clientY;
      });

      if (this.enabled) {
        this.start();
      }
    },

    resize: function () {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    createLeaf: function (randomY) {
      var w = this.canvas ? this.canvas.width : window.innerWidth;
      var h = this.canvas ? this.canvas.height : window.innerHeight;
      var color = this.leafColors[Math.floor(Math.random() * this.leafColors.length)];

      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : -40 - Math.random() * 80,
        size: 14 + Math.random() * 18,
        speedY: 0.8 + Math.random() * 1.4,
        speedX: -0.3 + Math.random() * 0.8,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 0.03,
        oscillationSpeed: 0.02 + Math.random() * 0.03,
        oscillationDistance: 20 + Math.random() * 35,
        oscillationStep: Math.random() * Math.PI * 2,
        type: Math.floor(Math.random() * 3), // 0: Maple, 1: Oak, 2: Birch/Elm
        color: color,
        opacity: 0.65 + Math.random() * 0.35,
        flip: 0,
        flipSpeed: 0.02 + Math.random() * 0.04
      };
    },

    start: function () {
      if (!this.animId) {
        this.loop = this.loop.bind(this);
        this.animId = requestAnimationFrame(this.loop);
      }
    },

    stop: function () {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    },

    toggle: function () {
      this.enabled = !this.enabled;
      localStorage.setItem("autumn_leaves_enabled", this.enabled);
      if (this.enabled) {
        this.start();
      } else {
        this.stop();
      }
      return this.enabled;
    },

    // Gentle burst of leaves on high-scoring merge or new game
    burst: function (count) {
      if (!this.enabled || !this.canvas) return;
      var add = count || 8;
      for (var i = 0; i < add; i++) {
        var leaf = this.createLeaf(false);
        leaf.y = Math.random() * (this.canvas.height * 0.5);
        leaf.speedY += 1.2;
        this.leaves.push(leaf);
      }
      // Keep leaf array from growing indefinitely
      if (this.leaves.length > 50) {
        this.leaves.splice(0, this.leaves.length - 40);
      }
    },

    drawLeafShape: function (ctx, type, size) {
      ctx.beginPath();
      if (type === 0) {
        // Stylized Maple Leaf
        ctx.moveTo(0, -size);
        ctx.bezierCurveTo(size * 0.4, -size * 0.6, size * 0.8, -size * 0.4, size, -size * 0.1);
        ctx.bezierCurveTo(size * 0.7, size * 0.2, size * 0.6, size * 0.6, 0, size);
        ctx.bezierCurveTo(-size * 0.6, size * 0.6, -size * 0.7, size * 0.2, -size, -size * 0.1);
        ctx.bezierCurveTo(-size * 0.8, -size * 0.4, -size * 0.4, -size * 0.6, 0, -size);
      } else if (type === 1) {
        // Stylized Oak Leaf
        ctx.moveTo(0, -size);
        ctx.quadraticCurveTo(size * 0.6, -size * 0.5, size * 0.4, -size * 0.1);
        ctx.quadraticCurveTo(size * 0.8, size * 0.2, size * 0.3, size * 0.5);
        ctx.quadraticCurveTo(size * 0.2, size * 0.8, 0, size);
        ctx.quadraticCurveTo(-size * 0.2, size * 0.8, -size * 0.3, size * 0.5);
        ctx.quadraticCurveTo(-size * 0.8, size * 0.2, -size * 0.4, -size * 0.1);
        ctx.quadraticCurveTo(-size * 0.6, -size * 0.5, 0, -size);
      } else {
        // Stylized Oval / Birch Leaf
        ctx.moveTo(0, -size);
        ctx.bezierCurveTo(size * 0.7, -size * 0.5, size * 0.7, size * 0.5, 0, size);
        ctx.bezierCurveTo(-size * 0.7, size * 0.5, -size * 0.7, -size * 0.5, 0, -size);
      }
      ctx.closePath();
    },

    loop: function () {
      if (!this.enabled) return;

      var ctx = this.ctx;
      var w = this.canvas.width;
      var h = this.canvas.height;

      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < this.leaves.length; i++) {
        var leaf = this.leaves[i];

        // Physics update
        leaf.oscillationStep += leaf.oscillationSpeed;
        leaf.angle += leaf.angularSpeed;
        leaf.flip += leaf.flipSpeed;

        var sway = Math.sin(leaf.oscillationStep) * leaf.oscillationDistance;
        var currentX = leaf.x + sway + this.wind;
        leaf.y += leaf.speedY;

        // Render leaf with 3D flip effect
        ctx.save();
        ctx.translate(currentX, leaf.y);
        ctx.rotate(leaf.angle);
        ctx.scale(Math.cos(leaf.flip), 1); // 3D tumbling perspective
        ctx.globalAlpha = leaf.opacity;

        ctx.fillStyle = leaf.color.fill;
        ctx.strokeStyle = leaf.color.stroke;
        ctx.lineWidth = 1;

        this.drawLeafShape(ctx, leaf.type, leaf.size);

        ctx.fill();
        ctx.stroke();

        // Draw leaf stem
        ctx.beginPath();
        ctx.moveTo(0, leaf.size * 0.8);
        ctx.lineTo(0, leaf.size * 1.25);
        ctx.strokeStyle = leaf.color.stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();

        // Wrap around when leaf falls off bottom or sides
        if (leaf.y > h + 40 || currentX < -60 || currentX > w + 60) {
          this.leaves[i] = this.createLeaf(false);
        }
      }

      this.animId = requestAnimationFrame(this.loop);
    }
  };

  // =========================================================================
  // 3. UI Hooking and Interactivity Enhancements
  // =========================================================================
  function initAutumnTheme() {
    AutumnAudio.init();
    AutumnLeaves.init();

    // Intercept keyboard arrow navigation to play slide audio
    window.addEventListener("keydown", function (e) {
      // 37-40: Arrow keys, 87, 65, 83, 68: WASD
      if ([37, 38, 39, 40, 65, 87, 68, 83].indexOf(e.which) !== -1) {
        AutumnAudio.playSlide();
      }
    });

    // Touch swipe sound
    var gameContainer = document.querySelector(".game-container");
    if (gameContainer) {
      gameContainer.addEventListener("touchend", function () {
        AutumnAudio.playSlide();
      });
    }

    // Hook into HTMLActuator to trigger sounds on score changes / merges
    if (window.HTMLActuator) {
      var originalUpdateScore = window.HTMLActuator.prototype.updateScore;
      window.HTMLActuator.prototype.updateScore = function (score) {
        var diff = score - this.score;
        originalUpdateScore.call(this, score);

        if (diff > 0) {
          AutumnAudio.playMerge(diff);
          if (diff >= 32) {
            AutumnLeaves.burst(6);
          }
        }
      };

      var originalMessage = window.HTMLActuator.prototype.message;
      window.HTMLActuator.prototype.message = function (won) {
        originalMessage.call(this, won);
        if (won) {
          AutumnAudio.playWin();
          AutumnLeaves.burst(20);
        }
      };
    }

    // Restart button leaf burst
    var restartBtn = document.querySelector(".restart-button");
    if (restartBtn) {
      restartBtn.addEventListener("click", function () {
        AutumnLeaves.burst(10);
      });
    }
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutumnTheme);
  } else {
    initAutumnTheme();
  }

  // Export to window for debugging or manual triggering
  window.AutumnTheme = {
    audio: AutumnAudio,
    leaves: AutumnLeaves
  };
})();
