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
  baselineFps: number;
  history: number[];
  minFps: number;
}

export class PerformanceMonitor implements Monitor<PerformanceInfo> {
  private static readonly WARMUP_SAMPLE_COUNT = 3;
  private frameHistory: number[] = [];
  private callbacks: Array<(info: PerformanceInfo) => void> = [];

  private animationId?: number;
  private isMonitoring = false;

  private maxHistorySize: number;

  // baseline (target) FPS;
  private baselineFps = 60;
  private warmupSamples = 0;

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

    const publishReset =
      this.frameHistory.length > 0 || this.warmupSamples > 0 || this.baselineFps !== 60;
    this.isMonitoring = true;
    this.setupVisibilityHandling();
    this.initializeHistory(publishReset);
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
    this.baselineFps = 60;
    this.warmupSamples = 0;
    this.bucketStart = 0;
    this.bucketFrames = 0;
    this.callbacks = [];
  }

  subscribe(callback: (info: PerformanceInfo) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  // ---- internal ----

  private initializeHistory(publishReset = false) {
    this.frameHistory = [];
    this.baselineFps = 60;
    this.warmupSamples = 0;
    this.bucketStart = performance.now();
    this.bucketFrames = 0;

    if (publishReset) {
      this.emit({
        fps: 0,
        jankPercentage: 0,
        baselineFps: 60,
        history: [],
        minFps: 0,
      });
    }
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
        const measuredFps = Math.round((this.bucketFrames * 1000) / elapsed);
        if (this.warmupSamples < PerformanceMonitor.WARMUP_SAMPLE_COUNT) {
          this.warmupSamples++;
        } else {
          this.pushFps(measuredFps);
          this.emitSnapshot(measuredFps);
          this.updateBaselineFromRecentHistory();
        }

        // Prepare next bucket. Carry over any spillover time to reduce drift.
        // If more than 1s elapsed (extreme throttling), just reset cleanly.
        if (elapsed > 1400) {
          this.bucketStart = now;
        } else {
          this.bucketStart += 1000;
        }
        this.bucketFrames = 0;
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
        this.initializeHistory(true);
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
    const { frameHistory, baselineFps } = this;
    this.emit({
      fps: currentFps,
      jankPercentage: this.calculateJankPercentage(frameHistory, baselineFps),
      baselineFps,
      history: [...frameHistory],
      minFps: Math.min(...frameHistory),
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

    const sorted = [...this.frameHistory].sort((a, b) => a - b);
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const min = sorted[0];
    const max = sorted.at(-1) ?? min;
    if (
      this.frameHistory.length >= this.maxHistorySize &&
      max - min <= 0.1 * max &&
      max < this.baselineFps * 0.85
    ) {
      this.baselineFps = Math.max(60, Math.min(240, Math.round(p75)));
      return;
    }

    const target = Math.max(60, Math.min(240, p75));
    if (target <= this.baselineFps) return;

    this.baselineFps = Math.round(this.baselineFps + 0.35 * (target - this.baselineFps));
  }
}
