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
  ONGOING_FAST_REPEAT_MS,
  ONGOING_FAST_REPEAT_UNTIL_MS,
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
  /** Blocks with no warning at all (neither ongoing nor end) since the last reported one. */
  suppressedBlocks: number;
  /** True for a report on a block that hasn't ended yet. */
  ongoing: boolean;
  /** True once an ongoing warning was written for the block, including this report. */
  reportedOngoing: boolean;
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
  /** When the next ongoing report is due. */
  nextReportAt: number;
  /** An ongoing warning was written for this block. */
  reportedOngoing: boolean;
}

/** Clock-injected state machine detecting blocks from a stale heartbeat (milliseconds). */
export class BlockDetector {
  private ongoing?: OngoingBlock;
  private reportTokens = REPORT_BURST;
  private lastRefillAt?: number;
  private suppressedBlocks = 0;

  /**
   * Returns the block that ended, or a report on the ongoing block when one is due, given the
   * main thread's last heartbeat.
   */
  public poll(
    now: number,
    lastHeartbeat: number,
    { thresholdMs, phase }: PollContext
  ): DetectedBlock | undefined {
    const { ongoing } = this;
    if (ongoing === undefined) {
      if (now - lastHeartbeat < thresholdMs) {
        return;
      }
      this.ongoing = {
        startedAt: lastHeartbeat,
        phase,
        nextReportAt: lastHeartbeat + Math.max(thresholdMs, ONGOING_REPORT_AFTER_MS),
        reportedOngoing: false,
      };
      // Due right away when the threshold is the longer of the two.
      return this.pollOngoing(now, this.ongoing);
    }
    if (lastHeartbeat <= ongoing.startedAt) {
      return this.pollOngoing(now, ongoing);
    }
    this.ongoing = undefined;
    const report = this.takeReportToken(now);
    const suppressedBlocks = report ? this.suppressedBlocks : 0;
    // A block whose ongoing warning was written isn't one without a warning, even if its end is.
    if (report) {
      this.suppressedBlocks = 0;
    } else if (!ongoing.reportedOngoing) {
      this.suppressedBlocks++;
    }
    return {
      phase: ongoing.phase,
      startedAt: ongoing.startedAt,
      endedAt: lastHeartbeat,
      blockedMs: lastHeartbeat - ongoing.startedAt,
      report,
      suppressedBlocks,
      ongoing: false,
      reportedOngoing: ongoing.reportedOngoing,
    };
  }

  /**
   * An ongoing report is due once the block has lasted the ongoing mark, then every fast repeat
   * interval early in the block, then every refill interval. It doesn't take or check a report
   * token, so warnings on earlier short blocks can't suppress it. Only one block is ongoing at a
   * time, so this schedule bounds the ongoing reports.
   */
  private pollOngoing(now: number, ongoing: OngoingBlock): DetectedBlock | undefined {
    if (now < ongoing.nextReportAt) {
      return;
    }
    const fastRepeatAt = now + ONGOING_FAST_REPEAT_MS;
    ongoing.nextReportAt =
      fastRepeatAt - ongoing.startedAt <= ONGOING_FAST_REPEAT_UNTIL_MS
        ? fastRepeatAt
        : now + REPORT_REFILL_MS;
    ongoing.reportedOngoing = true;
    return {
      phase: ongoing.phase,
      startedAt: ongoing.startedAt,
      endedAt: now,
      blockedMs: now - ongoing.startedAt,
      report: true,
      // Left to the block's end report, which reports or counts the suppressed blocks as before.
      suppressedBlocks: 0,
      ongoing: true,
      reportedOngoing: true,
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
