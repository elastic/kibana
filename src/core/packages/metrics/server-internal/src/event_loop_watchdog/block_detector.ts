/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WatchdogOptions } from './types';

/** Reports that may be logged in a burst before the report rate limit applies. */
export const REPORT_BURST = 5;
/** Interval at which one report token is refilled after the burst is used up. */
export const REPORT_REFILL_MS = 60_000;

export type DetectorEvent =
  | { type: 'block-start'; startedAt: number; detectedAt: number }
  | { type: 'live-notice'; startedAt: number; elapsedMs: number; count: number }
  /** The block has lasted `profileAfter` and the cooldown allows a capture. */
  | { type: 'profile-start'; blockId: number }
  | { type: 'profile-deadline' }
  | {
      type: 'block-end';
      startedAt: number;
      endedAt: number;
      blockedMs: number;
      liveNotices: number;
      /** False when the report is suppressed by the report rate limit. */
      report: boolean;
      /** Blocks whose reports were suppressed since the last emitted report. */
      suppressedBlocks: number;
    };

type DetectorOptions = Pick<
  WatchdogOptions,
  | 'thresholdMs'
  | 'liveNoticeIntervalMs'
  | 'maxLiveNoticesPerBlock'
  | 'profileAfterMs'
  | 'maxProfileDurationMs'
  | 'profileCooldownMs'
>;

interface BlockState {
  id: number;
  startedAt: number;
  liveNotices: number;
  lastLiveNoticeAt: number;
  profileRequested: boolean;
  profileStartedAt?: number;
  profileDeadlineEmitted: boolean;
}

/**
 * Pure, clock-injected state machine deciding when a block starts/ends, when to emit live
 * notices, when to profile and when to report. All limits are enforced here, in the worker, so
 * they hold while the main thread is blocked.
 */
export class BlockDetector {
  private block?: BlockState;
  private lastProfileStartedAt = Number.NEGATIVE_INFINITY;
  private nextBlockId = 0;
  private reportTokens = REPORT_BURST;
  private lastRefillAt?: number;
  private suppressedBlocks = 0;

  constructor(private readonly options: DetectorOptions) {}

  public get isBlocked(): boolean {
    return this.block !== undefined;
  }

  /** Evaluates the heartbeat at `now`; `lastHeartbeat` is the main thread's last stamp. */
  public poll(now: number, lastHeartbeat: number): DetectorEvent[] {
    const { block, options } = this;

    if (!block) {
      if (now - lastHeartbeat < options.thresholdMs) return [];
      this.block = {
        id: this.nextBlockId++,
        startedAt: lastHeartbeat,
        liveNotices: 0,
        lastLiveNoticeAt: lastHeartbeat,
        profileRequested: false,
        profileDeadlineEmitted: false,
      };
      return [{ type: 'block-start', startedAt: lastHeartbeat, detectedAt: now }];
    }

    if (lastHeartbeat > block.startedAt) {
      this.block = undefined;
      const report = this.takeReportToken(now);
      const suppressedBlocks = this.suppressedBlocks;
      if (report) {
        this.suppressedBlocks = 0;
      } else {
        this.suppressedBlocks++;
      }
      return [
        {
          type: 'block-end',
          startedAt: block.startedAt,
          endedAt: lastHeartbeat,
          blockedMs: lastHeartbeat - block.startedAt,
          liveNotices: block.liveNotices,
          report,
          suppressedBlocks: report ? suppressedBlocks : 0,
        },
      ];
    }

    const events: DetectorEvent[] = [];
    if (
      block.liveNotices < options.maxLiveNoticesPerBlock &&
      now - block.lastLiveNoticeAt >= options.liveNoticeIntervalMs
    ) {
      block.liveNotices++;
      block.lastLiveNoticeAt = now;
      events.push({
        type: 'live-notice',
        startedAt: block.startedAt,
        elapsedMs: now - block.startedAt,
        count: block.liveNotices,
      });
    }
    if (
      !block.profileRequested &&
      now - block.startedAt >= options.profileAfterMs &&
      now - this.lastProfileStartedAt >= options.profileCooldownMs
    ) {
      block.profileRequested = true;
      events.push({ type: 'profile-start', blockId: block.id });
    }
    if (
      block.profileStartedAt !== undefined &&
      !block.profileDeadlineEmitted &&
      now - block.profileStartedAt >= options.maxProfileDurationMs
    ) {
      block.profileDeadlineEmitted = true;
      events.push({ type: 'profile-deadline' });
    }
    return events;
  }

  /**
   * Records that the profiler started (acknowledged) at `now` for the capture requested by block
   * `blockId`. Only then is the cooldown consumed, so skipped or long-pending captures do not skew
   * it. The profile deadline is armed only if that same block is still ongoing.
   */
  public onCaptureStarted(now: number, blockId: number): void {
    this.lastProfileStartedAt = now;
    if (this.block?.id === blockId && this.block.profileStartedAt === undefined) {
      this.block.profileStartedAt = now;
    }
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
