/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Monitor } from '../monitor';

export interface LongTaskInfo {
  worstTaskDuration: number; // largest retained task duration (ms)
  totalBlockingTime: number; // sum over window of max(0, duration - 50)
  tasksInLast30Seconds: number; // number of tasks >= 100ms in the window
}

// Long Task entries are PerformanceEntry with startTime/duration (+ optional attribution)
export type PerformanceLongTaskTiming = PerformanceEntry & {
  duration: number;
  startTime: number;
};

export class LongTaskMonitor implements Monitor<LongTaskInfo> {
  // Good defaults
  private static readonly HISTORY_DURATION = 30_000; // 30s sliding window
  private static readonly SLOW_TASK_THRESHOLD = 100;
  private static readonly TBT_BASELINE = 50; // TBT counts duration beyond 50ms
  private static readonly MAX_TASKS = 500; // soft cap to bound memory

  private callbacks: Array<(info: LongTaskInfo) => void> = [];
  private observer?: PerformanceObserver;
  private supportedFlag: boolean;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private isMonitoring = false;
  private sessionStartedAt = 0;

  private taskHistory: Array<{ duration: number; startTime: number }> = [];

  private worstTaskDuration = 0;

  constructor() {
    this.supportedFlag = this.checkLongTaskSupport();
  }

  private checkLongTaskSupport(): boolean {
    return (
      typeof PerformanceObserver !== 'undefined' &&
      Array.isArray(PerformanceObserver.supportedEntryTypes) &&
      PerformanceObserver.supportedEntryTypes.includes('longtask')
    );
  }

  isSupported(): boolean {
    return this.supportedFlag;
  }

  startMonitoring() {
    if (!this.supportedFlag) return;
    if (this.observer) return; // idempotent

    this.resetSessionState();
    this.sessionStartedAt = performance.now();

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceLongTaskTiming[];
        for (const entry of entries) this.handleLongTask(entry);
      });

      this.observer.observe({ type: 'longtask' });
      this.isMonitoring = true;
      this.publishCurrentStats();
    } catch (error) {
      this.stopMonitoring();
      // eslint-disable-next-line no-console
      console.warn('Failed to start long task monitoring:', error);
    }
  }

  private resetSessionState() {
    if (this.expiryTimer != null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = undefined;
    }
    this.taskHistory = [];
    this.worstTaskDuration = 0;
  }

  private pushTask(task: { duration: number; startTime: number }) {
    this.taskHistory.push(task);

    // Bound memory: drop oldest if we exceed the cap.
    if (this.taskHistory.length > LongTaskMonitor.MAX_TASKS) {
      const extra = this.taskHistory.length - LongTaskMonitor.MAX_TASKS;
      this.taskHistory.splice(0, extra);
    }
  }

  private cleanupHistory() {
    const cutoff = performance.now() - LongTaskMonitor.HISTORY_DURATION;
    // Entries arrive roughly in time order; filter is still safe if they don't.
    if (this.taskHistory.length) {
      this.taskHistory = this.taskHistory.filter((task) => task.startTime > cutoff);
    }

    this.worstTaskDuration = Math.max(0, ...this.taskHistory.map(({ duration }) => duration));
  }

  private calculateTotalBlockingTime(): number {
    // TBT sums the amount beyond 50ms per long task.
    let total = 0;
    const baseline = LongTaskMonitor.TBT_BASELINE;
    for (const t of this.taskHistory) {
      const block = t.duration - baseline;
      if (block > 0) total += block;
    }
    return total;
  }

  private publishCurrentStats() {
    if (!this.isMonitoring) return;
    const info = this.getCurrentStats();
    for (const cb of this.callbacks) cb(info);
    this.scheduleExpiry();
  }

  private scheduleExpiry() {
    if (this.expiryTimer != null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = undefined;
    }
    if (!this.isMonitoring || this.taskHistory.length === 0) return;

    const oldestStartTime = Math.min(...this.taskHistory.map(({ startTime }) => startTime));
    const delay = Math.max(
      1,
      oldestStartTime + LongTaskMonitor.HISTORY_DURATION - performance.now()
    );
    this.expiryTimer = setTimeout(() => this.publishCurrentStats(), delay);
  }

  private handleLongTask(entry: PerformanceLongTaskTiming) {
    if (!this.isMonitoring) return;
    const { duration, startTime } = entry;
    if (startTime < this.sessionStartedAt) return;
    if (duration <= LongTaskMonitor.TBT_BASELINE) return;

    this.pushTask({ duration, startTime });
    this.publishCurrentStats();
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.expiryTimer != null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = undefined;
    }
    if (this.observer) {
      try {
        this.observer.disconnect();
      } catch {
        // ignore
      } finally {
        this.observer = undefined;
      }
    }
  }

  destroy() {
    this.stopMonitoring();
    this.resetSessionState();
    this.callbacks = [];
  }

  subscribe(callback: (info: LongTaskInfo) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  // Snapshot current stats (cleans window first)
  getCurrentStats(): LongTaskInfo {
    this.cleanupHistory();
    return {
      totalBlockingTime: this.calculateTotalBlockingTime(),
      worstTaskDuration: this.worstTaskDuration,
      tasksInLast30Seconds: this.taskHistory.filter(
        ({ duration }) => duration >= LongTaskMonitor.SLOW_TASK_THRESHOLD
      ).length,
    };
  }
}
