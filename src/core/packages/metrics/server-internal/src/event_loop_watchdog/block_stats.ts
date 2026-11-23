/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DetectedBlock } from './block_detector';
import type { Phase } from './types';

export interface BlockBuckets {
  /** From the threshold up to 1s. */
  lt1s: number;
  /** 1s up to 2s. */
  lt2s: number;
  /** 2s up to 5s. */
  lt5s: number;
  /** 5s and longer. */
  gte5s: number;
}

export interface PhaseStats {
  thresholdMs: number;
  blocks: number;
  /** Blocks whose warning log line was suppressed by the rate limit. */
  suppressed: number;
  maxBlockedMs: number;
  buckets: BlockBuckets;
}

export interface BlockStatsSnapshot {
  /** Time covered by these counts; longer than the stats interval when counts were carried over. */
  periodMs: number;
  starting: PhaseStats;
  running: PhaseStats;
}

const emptyPhaseStats = (thresholdMs: number): PhaseStats => ({
  thresholdMs,
  blocks: 0,
  suppressed: 0,
  maxBlockedMs: 0,
  buckets: { lt1s: 0, lt2s: 0, lt5s: 0, gte5s: 0 },
});

const bucketOf = (blockedMs: number): keyof BlockBuckets => {
  if (blockedMs < 1_000) {
    return 'lt1s';
  }
  if (blockedMs < 2_000) {
    return 'lt2s';
  }
  if (blockedMs < 5_000) {
    return 'lt5s';
  }
  return 'gte5s';
};

/** Counts blocks per phase and duration bucket for the stats log line. */
export class BlockStats {
  private periodStart: number;
  private phases: Record<Phase, PhaseStats>;

  constructor(private readonly thresholdsMs: Readonly<Record<Phase, number>>, now: number) {
    this.periodStart = now;
    this.phases = this.emptyPhases();
  }

  public record({ phase, blockedMs, report }: DetectedBlock): void {
    const stats = this.phases[phase];
    stats.blocks++;
    stats.buckets[bucketOf(blockedMs)]++;
    stats.maxBlockedMs = Math.max(stats.maxBlockedMs, blockedMs);
    if (!report) {
      stats.suppressed++;
    }
  }

  /** Counts since the last reset. Doesn't reset, so counts carry over if the log line is lost. */
  public snapshot(now: number): BlockStatsSnapshot {
    const { starting, running } = this.phases;
    return {
      periodMs: now - this.periodStart,
      starting: { ...starting, buckets: { ...starting.buckets } },
      running: { ...running, buckets: { ...running.buckets } },
    };
  }

  public reset(now: number): void {
    this.periodStart = now;
    this.phases = this.emptyPhases();
  }

  private emptyPhases(): Record<Phase, PhaseStats> {
    return {
      starting: emptyPhaseStats(this.thresholdsMs.starting),
      running: emptyPhaseStats(this.thresholdsMs.running),
    };
  }
}
