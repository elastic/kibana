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
  duration: number; // last task duration (ms)
  totalBlockingTime: number; // sum over window of max(0, duration - 50)
  tasksInLast30Seconds: number; // number of long tasks in the window
}

// Long Task entries are PerformanceEntry with startTime/duration (+ optional attribution)
export type PerformanceLongTaskTiming = PerformanceEntry & {
  duration: number;
  startTime: number;
};

export class LongTaskMonitor implements Monitor<LongTaskInfo> {
  // Good defaults
  private static readonly HISTORY_DURATION = 30_000; // 30s sliding window
  private static readonly SEVERE_THRESHOLD = 100; // only emit tasks >= 100ms
  private static readonly TBT_BASELINE = 50; // TBT counts duration beyond 50ms
  private static readonly MAX_TASKS = 500; // soft cap to bound memory

  private callbacks: Array<(info: LongTaskInfo) => void> = [];
  private observer?: PerformanceObserver;
  private supportedFlag: boolean;
  private expiryTimer?: number;
  private isMonitoring = false;

  private taskHistory: Array<{ duration: number; startTime: number }> = [];
  private lastTaskDuration = 0;

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

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceLongTaskTiming[];
        for (const entry of entries) this.handleLongTask(entry);
      });

      // Prefer single-type API to get buffered entries when available.
      // Fallback to entryTypes for older browsers.
      try {
        this.observer.observe({ type: 'longtask', buffered: true });
      } catch {
        this.observer.observe({ entryTypes: ['longtask'] });
      }
      this.isMonitoring = true;
      this.publishCurrentStats();
    } catch (error) {
      this.isMonitoring = false;
      // eslint-disable-next-line no-console
      console.warn('Failed to start long task monitoring:', error);
      this.observer = undefined;
    }
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
    const latestTask = this.taskHistory.reduce<{ duration: number; startTime: number } | undefined>(
      (latest, task) => (!latest || task.startTime > latest.startTime ? task : latest),
      undefined
    );
    this.lastTaskDuration = latestTask?.duration ?? 0;
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
    this.cleanupHistory();
    const info: LongTaskInfo = {
      duration: this.lastTaskDuration,
      totalBlockingTime: this.calculateTotalBlockingTime(),
      tasksInLast30Seconds: this.taskHistory.length,
    };
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
    this.expiryTimer = setTimeout(() => this.publishCurrentStats(), delay) as unknown as number;
  }

  private handleLongTask(entry: PerformanceLongTaskTiming) {
    const { duration, startTime } = entry;
    if (duration < LongTaskMonitor.SEVERE_THRESHOLD) return;

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
    this.callbacks = [];
    this.taskHistory = [];
    this.lastTaskDuration = 0;
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
      duration: this.lastTaskDuration,
      totalBlockingTime: this.calculateTotalBlockingTime(),
      tasksInLast30Seconds: this.taskHistory.length,
    };
  }
}
