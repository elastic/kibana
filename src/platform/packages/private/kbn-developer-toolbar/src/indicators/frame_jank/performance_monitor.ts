/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface PerformanceInfo {
  fps: number;
  jankPercentage: number;
  history: number[];
  maxFps: number;
  minFps: number;
}

export class PerformanceMonitor {
  private frameHistory: number[] = [];
  private callbacks: ((info: PerformanceInfo) => void)[] = [];
  private animationId?: number;
  private maxHistorySize: number;
  private readonly targetFps = 60;
  private isMonitoring = false;
  private visibilityChangeHandler?: () => void;

  constructor(maxHistorySize = 15) {
    this.maxHistorySize = maxHistorySize;
  }

  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.initializeWithBaselineData();
    this.setupVisibilityHandling();
    this.startMeasuring();
  }

  private initializeWithBaselineData() {
    // Prefill history with optimal performance data
    this.frameHistory = new Array(this.maxHistorySize).fill(this.targetFps);

    // Send initial callback with baseline data
    const initialPerformanceInfo: PerformanceInfo = {
      fps: this.targetFps,
      jankPercentage: 0,
      history: [...this.frameHistory],
      maxFps: this.targetFps,
      minFps: this.targetFps,
    };

    this.callbacks.forEach((cb) => cb(initialPerformanceInfo));
  }

  private startMeasuring() {
    if (!this.isMonitoring || document.hidden) {
      return;
    }

    let lastTime = performance.now();
    let frameCount = 0;

    const measureFPS = () => {
      // Skip if tab is backgrounded or monitoring stopped
      if (!this.isMonitoring || document.hidden) {
        return;
      }

      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.frameHistory.push(fps);

        if (this.frameHistory.length > this.maxHistorySize) {
          this.frameHistory.shift();
        }

        const maxFps = this.frameHistory.length > 0 ? Math.max(...this.frameHistory) : 0;
        const minFps = this.frameHistory.length > 0 ? Math.min(...this.frameHistory) : 0;
        const jankPercentage = this.calculateJankPercentage();

        this.callbacks.forEach((cb) =>
          cb({
            fps,
            jankPercentage,
            history: [...this.frameHistory],
            maxFps,
            minFps,
          })
        );

        frameCount = 0;
        lastTime = currentTime;
      }

      this.animationId = requestAnimationFrame(measureFPS);
    };

    this.animationId = requestAnimationFrame(measureFPS);
  }

  private setupVisibilityHandling() {
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        // Tab backgrounded - pause monitoring
        if (this.animationId) {
          cancelAnimationFrame(this.animationId);
          this.animationId = undefined;
        }
      } else {
        // Tab visible again - resume monitoring
        if (this.isMonitoring && !this.animationId) {
          this.startMeasuring();
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  stopMonitoring() {
    this.isMonitoring = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }

    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = undefined;
    }
  }

  destroy() {
    this.stopMonitoring();
    this.frameHistory = [];
    this.callbacks = [];
  }

  private calculateJankPercentage(): number {
    if (this.frameHistory.length === 0) {
      return 0;
    }

    // Calculate jank as percentage of frames significantly below target FPS
    const jankThreshold = this.targetFps * 0.8; // 80% of target (48fps for 60fps target)
    const jankFrames = this.frameHistory.filter((fps) => fps < jankThreshold).length;

    return Math.round((jankFrames / this.frameHistory.length) * 100);
  }

  subscribe(callback: (info: PerformanceInfo) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }
}
