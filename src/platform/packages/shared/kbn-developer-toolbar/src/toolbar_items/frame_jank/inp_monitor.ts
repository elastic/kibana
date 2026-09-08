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
  currentINP: number; // p75 of retained ≥100ms interactions in the 30-second window, not standard INP
  slowInteractionsCount: number; // count of *unique* interactions in the window
  worstInteractionDelay: number; // max latency in the window
  worstInteractionStartTime: number | null; // start time of the worst retained interaction
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
  private expiryTimer?: number;
  private isMonitoring = false;

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
  private worstInteractionStartTime: number | null = null;

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
      this.isMonitoring = true;
      this.publishCurrentStats();
    } catch (error) {
      this.stopMonitoring();
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
    if (!this.isMonitoring) return;
    const { name, duration, startTime, interactionId } = entry;

    if (!INPMonitor.isUserInteractionName(name)) return;
    if (duration < INPMonitor.SLOW_INTERACTION_THRESHOLD) return;

    // Positive interaction IDs are the only browser-provided identities. Some browsers emit
    // companion events with ID 0 for the same interaction, which must not become extra records.
    if (interactionId !== undefined && (!Number.isInteger(interactionId) || interactionId <= 0)) {
      return;
    }
    const key: number | string =
      interactionId === undefined ? `${name ?? 'unknown'}@${Math.round(startTime)}` : interactionId;

    const prev = this.interactionMap.get(key);
    const type = name ?? 'unknown';

    // Keep the worst latency seen for this interaction key.
    if (!prev || duration > prev.duration) {
      this.interactionMap.set(key, { duration, startTime, type });
    }

    this.publishCurrentStats();
  }

  private cleanupHistory() {
    const cutoff = performance.now() - INPMonitor.HISTORY_DURATION;

    // Drop items older than the window
    if (this.interactionMap.size > 0) {
      for (const [key, v] of this.interactionMap) {
        if (v.startTime <= cutoff) this.interactionMap.delete(key);
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

    // Recompute delays from retained interactions only.
    let worst = 0;
    let worstStartTime: number | null = null;
    let last = 0;
    let latestStartTime = -Infinity;
    for (const { duration, startTime } of this.interactionMap.values()) {
      if (
        duration > worst ||
        (duration === worst && (worstStartTime === null || startTime >= worstStartTime))
      ) {
        worst = duration;
        worstStartTime = startTime;
      }
      if (startTime >= latestStartTime) {
        latestStartTime = startTime;
        last = duration;
      }
    }
    this.worstInteractionDelay = worst;
    this.worstInteractionStartTime = worstStartTime;
    this.lastInteractionDelay = last;
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

  private publishCurrentStats(): void {
    if (!this.isMonitoring) return;
    const info = this.getCurrentStats();
    for (const cb of this.callbacks) cb(info);
    this.scheduleExpiry();
  }

  private scheduleExpiry(): void {
    if (this.expiryTimer != null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = undefined;
    }
    if (!this.isMonitoring || this.interactionMap.size === 0) return;

    let oldestStartTime = Infinity;
    for (const { startTime } of this.interactionMap.values()) {
      if (startTime < oldestStartTime) oldestStartTime = startTime;
    }
    const delay = Math.max(1, oldestStartTime + INPMonitor.HISTORY_DURATION - performance.now());
    this.expiryTimer = window.setTimeout(() => this.publishCurrentStats(), delay);
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.expiryTimer != null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = undefined;
    }
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
    this.worstInteractionStartTime = null;
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
      worstInteractionStartTime: this.worstInteractionStartTime,
    };
  }
}
