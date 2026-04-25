/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Monitor } from '../monitor';

export interface INPInfo {
  currentINP: number; // p75 of interaction latencies within the window
  slowInteractionsCount: number; // count of *unique* interactions in the window
  worstInteractionDelay: number; // max latency in the window
  lastInteractionDelay: number; // latency of the most recent interaction recorded
}

// Type definition for PerformanceEventTiming
export type PerformanceEventTiming = PerformanceEntry & {
  duration: number;
  processingStart: number;
  processingEnd: number;
  target?: Element;
  interactionId?: number;
  name?: string;
};

export class INPMonitor implements Monitor<INPInfo> {
  // Defaults
  private static readonly HISTORY_DURATION = 30_000; // 30s sliding window
  private static readonly SLOW_INTERACTION_THRESHOLD = 100; // ms (>=100ms)
  private static readonly MAX_INTERACTIONS = 500; // soft cap to bound memory

  private callbacks: Array<(info: INPInfo) => void> = [];
  private eventObserver?: PerformanceObserver;
  private supportedFlag: boolean;

  /**
   * We keep one entry per *interaction*, keyed by interactionId when available.
   * Each value stores the worst (max) duration seen for that interaction.
   */
  private interactionMap: Map<
    number | string,
    { duration: number; startTime: number; type: string }
  > = new Map();

  private lastInteractionDelay = 0;
  private worstInteractionDelay = 0;

  constructor() {
    this.supportedFlag = this.checkINPSupport();
  }

  private checkINPSupport(): boolean {
    return (
      typeof PerformanceObserver !== 'undefined' &&
      Array.isArray(PerformanceObserver.supportedEntryTypes) &&
      PerformanceObserver.supportedEntryTypes.includes('event')
    );
  }

  isSupported(): boolean {
    return this.supportedFlag;
  }

  startMonitoring() {
    if (!this.supportedFlag) return;
    if (this.eventObserver) return; // idempotent

    try {
      this.eventObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceEventTiming[];
        for (const entry of entries) {
          this.handleInteractionEvent(entry);
        }
      });

      // Let the UA skip fast events for us; still keep our check for safety.
      this.eventObserver.observe({
        type: 'event',
        buffered: true,
        durationThreshold: INPMonitor.SLOW_INTERACTION_THRESHOLD,
      } as PerformanceObserverInit);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to start INP monitoring:', error);
    }
  }

  private static isUserInteractionName(name?: string): boolean {
    // Event Timing spec reports a subset of user interaction events.
    // Keep this conservative and explicit.
    switch (name) {
      case 'click':
      case 'mousedown':
      case 'mouseup':
      case 'pointerdown':
      case 'pointerup':
      case 'touchstart':
      case 'touchend':
      case 'keydown':
      case 'keypress':
        return true;
      default:
        return false;
    }
  }

  private handleInteractionEvent(entry: PerformanceEventTiming) {
    const { name, duration, startTime, interactionId } = entry;

    if (!INPMonitor.isUserInteractionName(name)) return;
    if (duration < INPMonitor.SLOW_INTERACTION_THRESHOLD) return;

    // Prefer the browser-provided interactionId for deduplication.
    // If missing, fall back to a coarse key based on startTime+name (rare, but possible).
    const key: number | string =
      typeof interactionId === 'number'
        ? interactionId
        : `${name ?? 'unknown'}@${Math.round(startTime)}`;

    const prev = this.interactionMap.get(key);
    const type = name ?? 'unknown';

    // Keep the worst latency seen for this interaction key.
    if (!prev || duration > prev.duration) {
      this.interactionMap.set(key, { duration, startTime, type });
    }

    // Update rolling stats
    this.lastInteractionDelay = duration;
    if (duration > this.worstInteractionDelay) this.worstInteractionDelay = duration;

    // Maintain window + cap
    this.cleanupHistory();

    // Emit
    const info: INPInfo = {
      currentINP: this.calculateP75(),
      slowInteractionsCount: this.interactionMap.size,
      worstInteractionDelay: this.worstInteractionDelay,
      lastInteractionDelay: this.lastInteractionDelay,
    };
    for (const cb of this.callbacks) cb(info);
  }

  private cleanupHistory() {
    const cutoff = performance.now() - INPMonitor.HISTORY_DURATION;

    // Drop items older than the window
    if (this.interactionMap.size > 0) {
      for (const [key, v] of this.interactionMap) {
        if (v.startTime < cutoff) this.interactionMap.delete(key);
      }
    }

    // Soft cap to bound memory: if we somehow exceed, drop the oldest first.
    if (this.interactionMap.size > INPMonitor.MAX_INTERACTIONS) {
      const entries = Array.from(this.interactionMap.entries());
      entries.sort((a, b) => a[1].startTime - b[1].startTime);
      const toDrop = this.interactionMap.size - INPMonitor.MAX_INTERACTIONS;
      for (let i = 0; i < toDrop; i++) {
        this.interactionMap.delete(entries[i][0]);
      }
    }

    // Recompute worst within the current window to avoid stale max
    let worst = 0;
    for (const v of this.interactionMap.values()) {
      if (v.duration > worst) worst = v.duration;
    }
    this.worstInteractionDelay = worst;
  }

  private calculateP75(): number {
    const n = this.interactionMap.size;
    if (n === 0) return 0;

    const durations = new Array<number>(n);
    let i = 0;
    for (const v of this.interactionMap.values()) durations[i++] = v.duration;
    durations.sort((a, b) => a - b);

    const idx = Math.max(0, Math.ceil(durations.length * 0.75) - 1);
    return durations[idx] ?? 0;
  }

  stopMonitoring() {
    if (this.eventObserver) {
      try {
        this.eventObserver.disconnect();
      } catch {
        // ignore
      } finally {
        this.eventObserver = undefined;
      }
    }
  }

  destroy() {
    this.stopMonitoring();
    this.callbacks = [];
    this.interactionMap.clear();
    this.lastInteractionDelay = 0;
    this.worstInteractionDelay = 0;
  }

  subscribe(callback: (info: INPInfo) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  // Snapshot current stats (cleans window first)
  getCurrentStats(): INPInfo {
    this.cleanupHistory();
    return {
      currentINP: this.calculateP75(),
      slowInteractionsCount: this.interactionMap.size,
      worstInteractionDelay: this.worstInteractionDelay,
      lastInteractionDelay: this.lastInteractionDelay,
    };
  }
}
