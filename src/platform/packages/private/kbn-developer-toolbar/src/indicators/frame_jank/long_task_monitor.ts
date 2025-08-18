/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface LongTaskInfo {
  duration: number;
  totalBlockingTime: number;
  tasksInLast30Seconds: number;
}

// Type definition for PerformanceLongTaskTiming
export type PerformanceLongTaskTiming = PerformanceEntry;

export class LongTaskMonitor {
  private callbacks: ((info: LongTaskInfo) => void)[] = [];
  private observer?: PerformanceObserver;
  private isSupported: boolean;
  private taskHistory: Array<{ duration: number; startTime: number }> = [];
  private lastTaskDuration = 0;

  private readonly SEVERE_THRESHOLD = 100; // ms - threshold for tracking and reporting
  private readonly HISTORY_DURATION = 30000; // 30 seconds

  constructor() {
    this.isSupported = this.checkLongTaskSupport();
  }

  private checkLongTaskSupport(): boolean {
    return (
      typeof PerformanceObserver !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes &&
      PerformanceObserver.supportedEntryTypes.includes('longtask')
    );
  }

  startMonitoring() {
    if (!this.isSupported) {
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.handleLongTask(entry as PerformanceLongTaskTiming);
        });
      });

      this.observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to start long task monitoring:', error);
    }
  }

  private handleLongTask(entry: PerformanceLongTaskTiming) {
    // Only track and report tasks above severe threshold (≥100ms)
    if (entry.duration >= this.SEVERE_THRESHOLD) {
      // Add to history
      this.taskHistory.push({
        duration: entry.duration,
        startTime: entry.startTime,
      });
      this.lastTaskDuration = entry.duration;

      // Clean up old tasks and calculate current stats
      this.cleanupHistory();

      const info: LongTaskInfo = {
        duration: entry.duration,
        totalBlockingTime: this.calculateTotalBlockingTime(),
        tasksInLast30Seconds: this.taskHistory.length,
      };

      this.callbacks.forEach((cb) => cb(info));
    }
  }

  private cleanupHistory() {
    const cutoffTime = performance.now() - this.HISTORY_DURATION;
    this.taskHistory = this.taskHistory.filter((task) => task.startTime >= cutoffTime);
  }

  private calculateTotalBlockingTime(): number {
    return this.taskHistory.reduce((total, task) => total + task.duration, 0);
  }

  stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
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

  isMonitoringSupported(): boolean {
    return this.isSupported;
  }

  // Get current stats without waiting for new long task
  getCurrentStats(): LongTaskInfo {
    this.cleanupHistory();
    return {
      duration: this.lastTaskDuration,
      totalBlockingTime: this.calculateTotalBlockingTime(),
      tasksInLast30Seconds: this.taskHistory.length,
    };
  }
}
