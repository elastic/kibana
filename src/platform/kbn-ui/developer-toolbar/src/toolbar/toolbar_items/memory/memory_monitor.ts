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
  heapUsageRatio: number; // used / limit
  growthDetected: boolean;
  sampleCount: number;
  shortTrendPerMin: number; // MiB/min
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

type Callback = (info: MemoryInfo | null) => void;

export class MemoryMonitor implements Monitor<MemoryInfo | null> {
  private static readonly INTERVAL_MS = 20_000;
  private static readonly WARMUP_MS = 60_000;
  private static readonly MIN_BASELINE_SAMPLES = 4;
  private static readonly MAX_HISTORY = 60;
  private static readonly SHORT_TREND_MB_PER_MIN = 15;
  private static readonly LONG_TREND_MB_PER_MIN = 8;
  private static readonly ABSOLUTE_INCREASE_MB = 100;

  private static median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  }

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
  private frozenBaseline: number | undefined;
  private callbacks = new Set<Callback>();
  private timer?: ReturnType<typeof setTimeout>;
  private startedAt = 0;
  private isMonitoring = false;
  private lastInfo: MemoryInfo | null | undefined;

  isSupported(): boolean {
    return MemoryMonitor.isSupported();
  }

  startMonitoring(): void {
    this.stopMonitoring();
    this.resetSessionState();
    this.lastInfo = undefined;
    this.startedAt = performance.now();
    this.isMonitoring = true;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibility, false);
    }
    this.sampleOnce();
    if (typeof document === 'undefined' || !document.hidden) {
      this.scheduleNext();
    }
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility, false);
    }
    this.clearTimer();
  }

  destroy(): void {
    this.stopMonitoring();
    this.resetSessionState();
    this.callbacks.clear();
    this.lastInfo = undefined;
  }

  subscribe(cb: Callback): () => void {
    this.callbacks.add(cb);
    if (this.lastInfo !== undefined) cb(this.lastInfo);
    return () => this.callbacks.delete(cb);
  }

  private resetSessionState() {
    this.history = [];
    this.sampleTimes = [];
    this.frozenBaseline = undefined;
  }

  private clearTimer() {
    if (this.timer == null) return;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private scheduleNext() {
    this.clearTimer();
    this.timer = setTimeout(() => {
      if (!this.isMonitoring || (typeof document !== 'undefined' && document.hidden)) return;
      this.sampleOnce();
      if (this.isMonitoring && (typeof document === 'undefined' || !document.hidden)) {
        this.scheduleNext();
      }
    }, MemoryMonitor.INTERVAL_MS);
  }

  private onVisibility = () => {
    if (!this.isMonitoring) return;
    this.clearTimer();
    if (document.hidden) return;
    this.sampleOnce();
    this.scheduleNext();
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
    this.history.push(usedMB);
    this.sampleTimes.push(performance.now());
    if (this.history.length > MemoryMonitor.MAX_HISTORY) {
      this.history.shift();
      this.sampleTimes.shift();
    }
    this.maybeFreezeBaseline();

    const info = this.buildInfo(usedMB, mem);
    this.lastInfo = info;
    this.callbacks.forEach((cb) => cb(info));
  }

  private maybeFreezeBaseline() {
    if (this.frozenBaseline !== undefined) return;
    if (performance.now() - this.startedAt < MemoryMonitor.WARMUP_MS) return;
    if (this.history.length < MemoryMonitor.MIN_BASELINE_SAMPLES) return;
    this.frozenBaseline = MemoryMonitor.median(this.history);
  }

  private buildInfo(current: number, mem: PerformanceMemory): MemoryInfo {
    const shortTrendPerMin = this.linearSlope(this.history.slice(-10), this.sampleTimes.slice(-10));
    const longTrendPerMin = this.linearSlope(this.history.slice(-20), this.sampleTimes.slice(-20));
    const absoluteIncrease = this.frozenBaseline === undefined ? 0 : current - this.frozenBaseline;
    const growthDetected =
      this.frozenBaseline !== undefined &&
      shortTrendPerMin > MemoryMonitor.SHORT_TREND_MB_PER_MIN &&
      longTrendPerMin > MemoryMonitor.LONG_TREND_MB_PER_MIN &&
      absoluteIncrease > MemoryMonitor.ABSOLUTE_INCREASE_MB;

    return {
      memoryUsage: current,
      heapUsageRatio: mem.usedJSHeapSize / mem.jsHeapSizeLimit,
      growthDetected,
      sampleCount: this.history.length,
      shortTrendPerMin,
    };
  }

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
