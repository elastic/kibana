/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Monitor } from '../monitor';

export interface MemoryInfo {
  memoryUsage: number; // MiB
  leak: boolean;
  history: number[]; // MiB samples
  heapUsageRatio?: number; // used / limit
  details?: {
    shortTrendPerMin: number; // MiB/min
    longTrendPerMin: number; // MiB/min
    baseline: number; // MiB
    absoluteIncrease: number; // MiB
  };
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

type Callback = (info: MemoryInfo | null) => void;

interface Config {
  intervalMs?: number; // sampling period
  warmupMs?: number; // time to skip leak detection
  maxHistory?: number; // cap stored samples
  // Leak thresholds (MiB/min, MiB absolute, ratio)
  shortTrendMbPerMin?: number;
  longTrendMbPerMin?: number;
  absoluteIncreaseMb?: number;
  highPressureRatio?: number; // used / limit
  pauseWhenHidden?: boolean; // don't sample on hidden tabs
}

export class MemoryMonitor implements Monitor<MemoryInfo | null> {
  private static readPerfMemory(): PerformanceMemory | null {
    try {
      if (typeof performance === 'undefined') return null;
      const perf: Performance & { memory?: Partial<PerformanceMemory> } = performance;
      const { usedJSHeapSize, jsHeapSizeLimit } = perf.memory ?? {};
      if (
        typeof usedJSHeapSize !== 'number' ||
        !Number.isFinite(usedJSHeapSize) ||
        usedJSHeapSize < 0 ||
        typeof jsHeapSizeLimit !== 'number' ||
        !Number.isFinite(jsHeapSizeLimit) ||
        jsHeapSizeLimit <= 0
      ) {
        return null;
      }
      return { usedJSHeapSize, jsHeapSizeLimit };
    } catch {
      return null;
    }
  }

  static readonly isSupported = (): boolean => MemoryMonitor.readPerfMemory() !== null;

  private history: number[] = [];
  private sampleTimes: number[] = [];
  private callbacks = new Set<Callback>();
  private timer?: ReturnType<typeof setTimeout>;
  private startedAt = 0;
  private isMonitoring = false;
  private lastInfo: MemoryInfo | null | undefined;
  private readonly cfg: Required<Config>;

  constructor(config: Config = {}) {
    this.cfg = {
      intervalMs: 20_000,
      warmupMs: 60_000,
      maxHistory: 60, // ~20 min @ 20s
      shortTrendMbPerMin: 15,
      longTrendMbPerMin: 8,
      absoluteIncreaseMb: 100,
      highPressureRatio: 0.85,
      pauseWhenHidden: true,
      ...config,
    };
  }

  isSupported(): boolean {
    return MemoryMonitor.isSupported();
  }

  startMonitoring(): void {
    this.stopMonitoring(); // ensure clean start
    this.history.length = 0; // reset
    this.sampleTimes.length = 0;
    this.lastInfo = undefined;
    this.startedAt = performance.now();
    this.isMonitoring = true;
    if (this.cfg.pauseWhenHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibility, false);
    }
    this.sampleOnce(); // immediate sample
    this.scheduleNext(); // kick loop
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.cfg.pauseWhenHidden && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility, false);
    }
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  destroy(): void {
    this.stopMonitoring();
    this.history.length = 0;
    this.callbacks.clear();
    this.sampleTimes.length = 0;
    this.lastInfo = undefined;
  }

  subscribe(cb: Callback): () => void {
    this.callbacks.add(cb);
    if (this.lastInfo !== undefined) cb(this.lastInfo);
    return () => this.callbacks.delete(cb);
  }

  // ---------- internals ----------

  private scheduleNext() {
    this.timer = setTimeout(() => {
      if (!this.isMonitoring) return;
      // Pause if hidden, but keep rescheduling to check for visibility flips
      if (this.cfg.pauseWhenHidden && typeof document !== 'undefined' && document.hidden) {
        this.scheduleNext();
        return;
      }
      this.sampleOnce();
      if (this.isMonitoring) this.scheduleNext();
    }, this.cfg.intervalMs);
  }

  private onVisibility = () => {
    if (!this.isMonitoring) return;
    // On becoming visible, take a sample “now” to avoid big gaps
    if (!document.hidden) this.sampleOnce();
  };

  private sampleOnce() {
    if (!this.isMonitoring) return;
    const mem = MemoryMonitor.readPerfMemory();
    if (!mem) {
      this.lastInfo = null;
      this.callbacks.forEach((cb) => cb(null));
      return;
    }

    const usedMB = mem.usedJSHeapSize / (1024 * 1024);
    const sampleTime = performance.now();
    this.history.push(usedMB);
    this.sampleTimes.push(sampleTime);
    if (this.history.length > this.cfg.maxHistory) {
      this.history.shift();
      this.sampleTimes.shift();
    }

    const info = this.buildInfo(usedMB, mem);
    this.lastInfo = info;
    this.callbacks.forEach((cb) => cb(info));
  }

  private buildInfo(current: number, mem: PerformanceMemory): MemoryInfo {
    const leak = this.detectLeak(mem);
    const heapUsageRatio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;

    const { baseline, absoluteIncrease, shortTrendPerMin, longTrendPerMin } =
      this.computeLeakMetrics();

    const base: MemoryInfo = {
      memoryUsage: current,
      leak,
      history: this.history,
      heapUsageRatio,
      details: {
        baseline,
        absoluteIncrease,
        shortTrendPerMin,
        longTrendPerMin,
      },
    };
    return base;
  }

  private computeLeakMetrics() {
    const h = this.history;
    const n = h.length;

    const elapsed = performance.now() - this.startedAt;
    const warmedUp = elapsed >= this.cfg.warmupMs;

    // Baseline = mean of earliest stable window after warm-up
    // Choose a window near the first third of samples when available
    const start = Math.max(0, Math.min(Math.floor(n / 3) - 5, n - 25));
    const end = Math.max(start + 5, Math.min(start + 15, n - 20));
    const baselineWindow = end > start ? h.slice(start, end) : [];
    const baseline =
      baselineWindow.length > 0
        ? baselineWindow.reduce((s, v) => s + v, 0) / baselineWindow.length
        : h[0] ?? 0;

    const recentShort = h.slice(-10); // last 10 samples
    const recentLong = h.slice(-20); // last 20 samples
    const recentShortTimes = this.sampleTimes.slice(-10);
    const recentLongTimes = this.sampleTimes.slice(-20);

    const shortTrendPerMin = this.linearSlope(recentShort, recentShortTimes);
    const longTrendPerMin = this.linearSlope(recentLong, recentLongTimes);

    const current = h[n - 1] ?? 0;
    const absoluteIncrease = current - baseline;

    return {
      warmedUp,
      baseline,
      absoluteIncrease,
      shortTrendPerMin,
      longTrendPerMin,
    };
  }

  private detectLeak(mem: PerformanceMemory): boolean {
    if (this.history.length < 10) return false;

    const { warmedUp, absoluteIncrease, shortTrendPerMin, longTrendPerMin } =
      this.computeLeakMetrics();

    if (!warmedUp) return false;

    const sustainedGrowth =
      shortTrendPerMin > this.cfg.shortTrendMbPerMin &&
      longTrendPerMin > this.cfg.longTrendMbPerMin;

    const significantIncrease = absoluteIncrease > this.cfg.absoluteIncreaseMb;
    const heapUsageRatio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;

    const highMemoryPressure = heapUsageRatio > this.cfg.highPressureRatio;

    return sustainedGrowth && significantIncrease && highMemoryPressure;
  }

  // Least squares slope in MiB/min using elapsed sample time as x.
  private linearSlope(data: number[], timestamps: number[]): number {
    const n = data.length;
    if (n < 2 || timestamps.length !== n) return 0;

    const firstTimestamp = timestamps[0];
    const relativeMinutes = timestamps.map((timestamp) => (timestamp - firstTimestamp) / 60_000);
    const smoothedData = this.smooth3(data);
    const smoothedTimes = this.smooth3(relativeMinutes);
    const meanX = smoothedTimes.reduce((sum, value) => sum + value, 0) / n;
    const meanY = smoothedData.reduce((sum, value) => sum + value, 0) / n;

    let covariance = 0;
    let variance = 0;
    for (let i = 0; i < n; i++) {
      const centeredX = smoothedTimes[i] - meanX;
      covariance += centeredX * (smoothedData[i] - meanY);
      variance += centeredX * centeredX;
    }

    return variance > 0 ? covariance / variance : 0;
  }

  private smooth3(data: number[]): number[] {
    if (data.length < 3) return data;
    const out = Array<number>(data.length);
    out[0] = data[0];
    for (let i = 1; i < data.length - 1; i++) {
      out[i] = (data[i - 1] + data[i] + data[i + 1]) / 3;
    }
    out[data.length - 1] = data[data.length - 1];
    return out;
  }
}
