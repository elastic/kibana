/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface INPInfo {
  currentINP: number;
  slowInteractionsCount: number;
  worstInteractionDelay: number;
  lastInteractionDelay: number;
}

// Type definition for PerformanceEventTiming
export type PerformanceEventTiming = PerformanceEntry & {
  duration: number;
  processingStart: number;
  processingEnd: number;
  target?: Element;
  interactionId?: number;
};

export class INPMonitor {
  private callbacks: ((info: INPInfo) => void)[] = [];
  private eventObserver?: PerformanceObserver;
  private isSupported: boolean;
  private interactionHistory: Array<{ duration: number; startTime: number; type: string }> = [];
  private lastInteractionDelay = 0;
  private worstInteractionDelay = 0;

  private readonly HISTORY_DURATION = 30000; // 30 seconds
  private readonly SLOW_INTERACTION_THRESHOLD = 100; // ms - only track interactions ≥100ms

  constructor() {
    this.isSupported = this.checkINPSupport();
  }

  private checkINPSupport(): boolean {
    return (
      typeof PerformanceObserver !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes &&
      PerformanceObserver.supportedEntryTypes.includes('event')
    );
  }

  startMonitoring() {
    if (!this.isSupported) {
      return;
    }

    try {
      // Monitor interaction events for INP
      this.eventObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.handleInteractionEvent(entry as PerformanceEventTiming);
        });
      });
      this.eventObserver.observe({
        type: 'event',
        buffered: true, // Get existing entries
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to start INP monitoring:', error);
    }
  }

  private handleInteractionEvent(entry: PerformanceEventTiming) {
    // Only track slow user interactions (≥100ms threshold)
    if (entry.duration >= this.SLOW_INTERACTION_THRESHOLD && this.isUserInteraction(entry)) {
      this.recordInteraction(entry.duration, entry.startTime, entry.name || 'unknown');
    }
  }

  private isUserInteraction(entry: PerformanceEventTiming): boolean {
    // Filter for actual user interactions
    const interactionEvents = [
      'click',
      'mousedown',
      'mouseup',
      'pointerdown',
      'pointerup',
      'touchstart',
      'touchend',
      'keydown',
      'keypress',
    ];
    return interactionEvents.includes(entry.name || '');
  }

  private recordInteraction(duration: number, startTime: number, type: string) {
    // Add to history
    this.interactionHistory.push({
      duration,
      startTime,
      type,
    });

    // Update tracking values
    this.lastInteractionDelay = duration;
    this.worstInteractionDelay = Math.max(this.worstInteractionDelay, duration);

    // Clean up old interactions and calculate current stats
    this.cleanupHistory();

    const info: INPInfo = {
      currentINP: this.calculateINP(),
      slowInteractionsCount: this.interactionHistory.length,
      worstInteractionDelay: this.worstInteractionDelay,
      lastInteractionDelay: this.lastInteractionDelay,
    };

    this.callbacks.forEach((cb) => cb(info));
  }

  private cleanupHistory() {
    const cutoffTime = performance.now() - this.HISTORY_DURATION;
    this.interactionHistory = this.interactionHistory.filter(
      (interaction) => interaction.startTime >= cutoffTime
    );
  }

  private calculateINP(): number {
    if (this.interactionHistory.length === 0) return 0;

    // Calculate 75th percentile (p75) for INP
    const durations = this.interactionHistory
      .map((interaction) => interaction.duration)
      .sort((a, b) => a - b);
    const p75Index = Math.ceil(durations.length * 0.75) - 1;
    return durations[p75Index] || 0;
  }

  stopMonitoring() {
    if (this.eventObserver) {
      this.eventObserver.disconnect();
      this.eventObserver = undefined;
    }
  }

  destroy() {
    this.stopMonitoring();
    this.callbacks = [];
    this.interactionHistory = [];
    this.lastInteractionDelay = 0;
    this.worstInteractionDelay = 0;
  }

  subscribe(callback: (info: INPInfo) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  isMonitoringSupported(): boolean {
    return this.isSupported;
  }

  // Get current stats without waiting for new interaction
  getCurrentStats(): INPInfo {
    this.cleanupHistory();
    return {
      currentINP: this.calculateINP(),
      slowInteractionsCount: this.interactionHistory.length,
      worstInteractionDelay: this.worstInteractionDelay,
      lastInteractionDelay: this.lastInteractionDelay,
    };
  }
}
