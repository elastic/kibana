/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Block reports that may be logged in a burst before the rate limit applies. */
export const REPORT_BURST = 5;
/** Interval at which one report token is refilled after the burst is used up. */
export const REPORT_REFILL_MS = 60_000;

export interface DetectedBlock {
  startedAt: number;
  endedAt: number;
  blockedMs: number;
  /** False when the report is suppressed by the rate limit. */
  report: boolean;
  /** Blocks whose reports were suppressed since the last emitted report. */
  suppressedBlocks: number;
}

/** Clock-injected state machine detecting blocks from a stale heartbeat (milliseconds). */
export class BlockDetector {
  private startedAt?: number;
  private reportTokens = REPORT_BURST;
  private lastRefillAt?: number;
  private suppressedBlocks = 0;

  constructor(private readonly thresholdMs: number) {}

  /** When the ongoing block started (its last heartbeat), while the main thread is blocked. */
  public get blockedSince(): number | undefined {
    return this.startedAt;
  }

  /** Returns the block that ended, if any, given the main thread's last heartbeat. */
  public poll(now: number, lastHeartbeat: number): DetectedBlock | undefined {
    const { startedAt } = this;
    if (startedAt === undefined) {
      if (now - lastHeartbeat >= this.thresholdMs) this.startedAt = lastHeartbeat;
      return;
    }
    if (lastHeartbeat <= startedAt) return;
    this.startedAt = undefined;
    const report = this.takeReportToken(now);
    const suppressedBlocks = report ? this.suppressedBlocks : 0;
    this.suppressedBlocks = report ? 0 : this.suppressedBlocks + 1;
    return {
      startedAt,
      endedAt: lastHeartbeat,
      blockedMs: lastHeartbeat - startedAt,
      report,
      suppressedBlocks,
    };
  }

  private takeReportToken(now: number): boolean {
    if (this.lastRefillAt === undefined) {
      this.lastRefillAt = now;
    } else {
      const refills = Math.floor((now - this.lastRefillAt) / REPORT_REFILL_MS);
      if (refills > 0) {
        this.reportTokens = Math.min(REPORT_BURST, this.reportTokens + refills);
        this.lastRefillAt += refills * REPORT_REFILL_MS;
      }
    }
    if (this.reportTokens <= 0) return false;
    this.reportTokens--;
    return true;
  }
}
