/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface MemoryInfo {
  memoryUsage: number;
  leak: boolean;
  history: number[];
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export class MemoryMonitor {
  private history: number[] = [];
  private callbacks: ((info: MemoryInfo) => void)[] = [];
  private interval?: ReturnType<typeof setInterval>;
  private startTime: number = performance.now();
  private readonly WARMUP_DURATION = 1 * 60 * 1000; // 1 minutes

  static readonly isSupported = () => {
    return (
      typeof performance !== 'undefined' &&
      'memory' in performance &&
      typeof (performance as any).memory?.usedJSHeapSize === 'number'
    );
  };

  constructor() {}

  startMonitoring() {
    if (!MemoryMonitor.isSupported()) {
      return;
    }

    // Reset state for fresh monitoring session
    this.history = [];

    // Run first measurement immediately
    this.measureMemory();

    this.interval = setInterval(() => {
      this.measureMemory();
    }, 5000);
  }

  private measureMemory() {
    try {
      const memory = (performance as any).memory as PerformanceMemory;
      if (memory?.usedJSHeapSize) {
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        this.history.push(usedMB);

        if (this.history.length > 100) {
          this.history.shift();
        }

        const leak = this.detectLeak();
        const memoryInfo: MemoryInfo = {
          memoryUsage: usedMB,
          leak,
          history: this.history.slice(),
        };

        this.callbacks.forEach((cb) => cb(memoryInfo));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Memory monitoring error:', error);
    }
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  resetHistory() {
    this.history = [];
    this.startTime = performance.now();
  }

  getMemorySnapshot() {
    if (!MemoryMonitor.isSupported()) {
      return null;
    }

    const memory = (performance as any).memory as PerformanceMemory;
    return {
      used: memory.usedJSHeapSize / (1024 * 1024),
      total: memory.totalJSHeapSize / (1024 * 1024),
      limit: memory.jsHeapSizeLimit / (1024 * 1024),
      utilization: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
    };
  }

  subscribe(callback: (info: MemoryInfo) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  private detectLeak(): boolean {
    if (this.history.length < 10) return false;

    // Skip leak detection during warm-up period
    const elapsedTime = performance.now() - this.startTime;
    if (elapsedTime < this.WARMUP_DURATION) {
      return false;
    }

    // Establish baseline memory from early measurements (after warm-up)
    const baselineStart = Math.max(0, Math.min(10, this.history.length - 40));
    const baselineEnd = Math.max(baselineStart + 5, Math.min(15, this.history.length - 30));
    const baselineMemory =
      this.history.slice(baselineStart, baselineEnd).reduce((sum, val) => sum + val, 0) /
      (baselineEnd - baselineStart);

    // Check multiple criteria for more accurate leak detection
    const recentShort = this.history.slice(-10); // Last 50 seconds
    const recentLong = this.history.slice(-20); // Last 100 seconds

    // Calculate trends (MB per measurement interval)
    const shortTrend = this.calculateTrend(recentShort);
    const longTrend = this.calculateTrend(recentLong);

    // Convert to MB per minute (measurements are every 5 seconds)
    const shortTrendPerMinute = shortTrend * 12; // 12 measurements per minute
    const longTrendPerMinute = longTrend * 12;

    // More conservative thresholds for Kibana (large app with normal memory fluctuations)
    const sustainedGrowth = shortTrendPerMinute > 15 && longTrendPerMinute > 8;

    // Absolute increase check: compare against established baseline
    const currentMemory = this.history[this.history.length - 1];
    const absoluteIncrease = currentMemory - baselineMemory;
    const significantIncrease = absoluteIncrease > 100; // 100MB increase from baseline

    // Memory pressure check: high percentage of heap usage
    const memory = (performance as any).memory as PerformanceMemory;
    const heapUsageRatio = memory ? memory.usedJSHeapSize / memory.totalJSHeapSize : 0;
    const highMemoryPressure = heapUsageRatio > 0.85; // 85% of heap used

    const isLeak = sustainedGrowth && significantIncrease && highMemoryPressure;

    return isLeak;
  }

  private calculateTrend(data: number[]): number {
    const n = data.length;
    if (n < 2) return 0;

    // Apply simple moving average smoothing to reduce noise
    const smoothed = this.smoothData(data);

    const sumX = (n * (n - 1)) / 2;
    const sumY = smoothed.reduce((sum, val) => sum + val, 0);
    const sumXY = smoothed.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return 0;

    return (n * sumXY - sumX * sumY) / denominator;
  }

  private smoothData(data: number[]): number[] {
    if (data.length < 3) return data;

    const smoothed: number[] = [];
    smoothed.push(data[0]); // Keep first point

    // Apply 3-point moving average for middle points
    for (let i = 1; i < data.length - 1; i++) {
      smoothed.push((data[i - 1] + data[i] + data[i + 1]) / 3);
    }

    smoothed.push(data[data.length - 1]); // Keep last point
    return smoothed;
  }
}
