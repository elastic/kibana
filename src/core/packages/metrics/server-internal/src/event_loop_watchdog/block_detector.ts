/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Phase } from './types';
import { ONGOING_REPORT_AFTER_MS, REPORT_BURST, REPORT_REFILL_MS } from './constants';

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
  /** When the next ongoing report is due. */
  nextReportAt: number;
  /** Whether an ongoing report was written: the end report then needs no token. */
  reported: boolean;
}

/** Clock-injected state machine detecting blocks from a stale heartbeat (milliseconds). */
export class BlockDetector {
  private ongoing?: OngoingBlock;
  private reportTokens = REPORT_BURST;
  private lastRefillAt?: number;
  private suppressedBlocks = 0;

  /** Start of the ongoing block, if any, so the worker can share it with the main thread. */
  public get ongoingStartedAt(): number | undefined {
    return this.ongoing?.startedAt;
  }

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
        reported: false,
      };
      // Due right away when the threshold is the longer of the two.
      return this.pollOngoing(now, this.ongoing);
    }
    if (lastHeartbeat <= ongoing.startedAt) {
      return this.pollOngoing(now, ongoing);
    }
    this.ongoing = undefined;
    // A block already reported while ongoing is only completed here, not reported again.
    const report = ongoing.reported || this.takeReportToken(now);
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
   * An ongoing report is due once the block has lasted the ongoing mark, then every refill
   * interval. A suppressed one tries again as soon as a token refills, so a block that outlives
   * the process waits at most one refill for its log line.
   */
  private pollOngoing(now: number, ongoing: OngoingBlock): DetectedBlock | undefined {
    if (now < ongoing.nextReportAt) {
      return;
    }
    const report = this.takeReportToken(now);
    ongoing.nextReportAt = report ? now + REPORT_REFILL_MS : this.lastRefillAt! + REPORT_REFILL_MS;
    // A suppressed ongoing report isn't a suppressed block: the block is still counted and may
    // still be reported when it ends.
    const suppressedBlocks = report ? this.suppressedBlocks : 0;
    if (report) {
      ongoing.reported = true;
      this.suppressedBlocks = 0;
    }
    return {
      phase: ongoing.phase,
      startedAt: ongoing.startedAt,
      endedAt: now,
      blockedMs: now - ongoing.startedAt,
      report,
      suppressedBlocks,
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
