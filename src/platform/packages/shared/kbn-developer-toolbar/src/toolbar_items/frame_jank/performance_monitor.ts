/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Monitor } from '../monitor';

export interface PerformanceInfo {
  fps: number;
  jankPercentage: number;
  history: number[];
  maxFps: number;
  minFps: number;
}

export class PerformanceMonitor implements Monitor<PerformanceInfo> {
  private frameHistory: number[] = [];
  private callbacks: Array<(info: PerformanceInfo) => void> = [];

  private animationId?: number;
  private isMonitoring = false;

  private maxHistorySize: number;

  // baseline (target) FPS;
  private baselineFps = 60;

  // Bookkeeping for per-second FPS aggregation.
  private bucketStart = 0;
  private bucketFrames = 0;

  private visibilityChangeHandler?: () => void;

  constructor(maxHistorySize = 15) {
    this.maxHistorySize = Math.max(5, maxHistorySize);
  }

  isSupported(): boolean {
    return typeof requestAnimationFrame !== 'undefined' && typeof performance !== 'undefined';
  }

  startMonitoring() {
    if (this.isMonitoring || !this.isSupported()) return;

    this.isMonitoring = true;
    this.setupVisibilityHandling();

    this.initializeWithBaselineData();
    this.startLoop();
  }

  stopMonitoring() {
    this.isMonitoring = false;

    if (this.animationId != null) {
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

  subscribe(callback: (info: PerformanceInfo) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  // ---- internal ----

  private initializeWithBaselineData() {
    // Prefill history to avoid noisy first renders; use calibrated baseline.
    this.frameHistory = new Array(this.maxHistorySize).fill(this.baselineFps);
    this.emit({
      fps: this.baselineFps,
      jankPercentage: 0,
      history: [...this.frameHistory],
      maxFps: this.baselineFps,
      minFps: this.baselineFps,
    });

    // Reset per-second bucket
    const now = performance.now();
    this.bucketStart = now;
    this.bucketFrames = 0;
  }

  private startLoop() {
    const tick = (now: number) => {
      if (!this.isMonitoring || document.hidden) return;

      // Count frames in the current 1s bucket
      if (this.bucketStart === 0) this.bucketStart = now;
      this.bucketFrames++;

      const elapsed = now - this.bucketStart;
      if (elapsed >= 1000) {
        // Compute FPS for the elapsed window rather than assuming exactly 1000ms
        const fps = Math.round((this.bucketFrames * 1000) / elapsed);

        // Clamp to a reasonable range to avoid noisy spikes
        const clamped = Math.max(0, Math.min(fps, 60));

        this.pushFps(clamped);
        this.emitSnapshot(clamped);

        // Prepare next bucket. Carry over any spillover time to reduce drift.
        // If more than 1s elapsed (extreme throttling), just reset cleanly.
        if (elapsed > 1400) {
          this.bucketStart = now;
        } else {
          this.bucketStart += 1000;
        }
        this.bucketFrames = 0;

        // Slowly adapt baseline upward/downward to follow device refresh changes (e.g., ProMotion).
        this.updateBaselineFromRecentHistory();
      }

      this.animationId = requestAnimationFrame(tick);
    };

    this.animationId = requestAnimationFrame(tick);
  }

  private setupVisibilityHandling() {
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        if (this.animationId != null) {
          cancelAnimationFrame(this.animationId);
          this.animationId = undefined;
        }
      } else if (this.isMonitoring && this.animationId == null) {
        // Reset the per-second bucket to avoid a giant elapsed gap on resume.
        const now = performance.now();
        this.bucketStart = now;
        this.bucketFrames = 0;
        this.startLoop();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  private pushFps(fps: number) {
    this.frameHistory.push(fps);
    if (this.frameHistory.length > this.maxHistorySize) this.frameHistory.shift();
  }

  private emitSnapshot(currentFps: number) {
    const history = this.frameHistory.length ? this.frameHistory : [currentFps];
    const maxFps = Math.max(...history);
    const minFps = Math.min(...history);
    const jankPercentage = this.calculateJankPercentage(history, this.baselineFps);

    this.emit({
      fps: currentFps,
      jankPercentage,
      history: [...history],
      maxFps,
      minFps,
    });
  }

  private emit(info: PerformanceInfo) {
    for (const cb of this.callbacks) cb(info);
  }

  private calculateJankPercentage(history: number[], baseline: number): number {
    if (!history.length || baseline <= 0) return 0;

    // Count “janky” seconds as those falling below 85% of the baseline.
    const threshold = baseline * 0.85;
    const janky = history.reduce((acc, v) => acc + (v < threshold ? 1 : 0), 0);
    return Math.round((janky / history.length) * 100);
  }

  private updateBaselineFromRecentHistory() {
    if (this.frameHistory.length < 3) return;

    // Use the 75th percentile as a “healthy” indicator, then gently ease baseline.
    const sorted = [...this.frameHistory].sort((a, b) => a - b);
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const target = Math.max(30, Math.min(240, p75));

    // Exponential smoothing toward target (fast up, slower down to avoid flip-flop).
    const upAlpha = 0.35;
    const downAlpha = 0.15;
    const alpha = target > this.baselineFps ? upAlpha : downAlpha;

    this.baselineFps = Math.round(this.baselineFps + alpha * (target - this.baselineFps));
  }
}
