/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Phase } from './types';
import {
  ONGOING_FAST_REPEATS_UNTIL_MS,
  ONGOING_REPEAT_MS,
  ONGOING_REPORT_AFTER_MS,
  REPORT_BURST,
  REPORT_REFILL_MS,
} from './constants';

export interface DetectedBlock {
  phase: Phase;
  startedAt: number;
  /** For an ongoing block: the time of this report. */
  endedAt: number;
  /** For an ongoing block: how long it has lasted so far. */
  blockedMs: number;
  /** False when the warning is suppressed by the rate limit. */
  report: boolean;
  /** Blocks whose warnings were suppressed since the last reported one. */
  suppressedBlocks: number;
  /** True for a report on a block that hasn't ended yet. */
  ongoing: boolean;
}

export interface PollContext {
  /** Threshold of the phase the last heartbeat belongs to. */
  thresholdMs: number;
  /** Phase of the last heartbeat; a block keeps the phase it started in. */
  phase: Phase;
}

interface OngoingBlock {
  startedAt: number;
  phase: Phase;
  nextReportAt: number;
}

/** Clock-injected state machine detecting blocks from a stale heartbeat (milliseconds). */
export class BlockDetector {
  private ongoing?: OngoingBlock;
  private reportTokens = REPORT_BURST;
  private lastRefillAt?: number;
  private suppressedBlocks = 0;

  /** The block in progress as of the last poll, if any. */
  public get current(): Readonly<{ startedAt: number; phase: Phase }> | undefined {
    const { ongoing } = this;
    return ongoing && { startedAt: ongoing.startedAt, phase: ongoing.phase };
  }

  /**
   * Returns the block that ended, or a report on the block still ongoing when one is due, given
   * the main thread's last heartbeat.
   */
  public poll(
    now: number,
    lastHeartbeat: number,
    { thresholdMs, phase }: PollContext
  ): DetectedBlock | undefined {
    const { ongoing } = this;
    if (ongoing === undefined) {
      if (now - lastHeartbeat >= thresholdMs) {
        this.ongoing = {
          startedAt: lastHeartbeat,
          phase,
          nextReportAt: lastHeartbeat + ONGOING_REPORT_AFTER_MS,
        };
        return this.reportOngoing(now, this.ongoing);
      }
      return;
    }
    if (lastHeartbeat <= ongoing.startedAt) {
      return this.reportOngoing(now, ongoing);
    }
    this.ongoing = undefined;
    const report = this.takeReportToken(now);
    const suppressedBlocks = report ? this.suppressedBlocks : 0;
    this.suppressedBlocks = report ? 0 : this.suppressedBlocks + 1;
    return {
      phase: ongoing.phase,
      startedAt: ongoing.startedAt,
      endedAt: lastHeartbeat,
      blockedMs: lastHeartbeat - ongoing.startedAt,
      report,
      suppressedBlocks,
      ongoing: false,
    };
  }

  /**
   * Ongoing reports aren't rate limited, so earlier short blocks can't suppress them; the schedule
   * bounds them instead.
   */
  private reportOngoing(now: number, ongoing: OngoingBlock): DetectedBlock | undefined {
    if (now < ongoing.nextReportAt) {
      return;
    }
    const blockedMs = now - ongoing.startedAt;
    ongoing.nextReportAt =
      now + (blockedMs < ONGOING_FAST_REPEATS_UNTIL_MS ? ONGOING_REPEAT_MS : REPORT_REFILL_MS);
    return {
      phase: ongoing.phase,
      startedAt: ongoing.startedAt,
      endedAt: now,
      blockedMs,
      report: true,
      suppressedBlocks: 0,
      ongoing: true,
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
    if (this.reportTokens <= 0) {
      return false;
    }
    this.reportTokens--;
    return true;
  }
}
