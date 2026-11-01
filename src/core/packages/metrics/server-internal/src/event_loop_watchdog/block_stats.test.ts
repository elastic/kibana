/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DetectedBlock } from './block_detector';
import { BlockStats } from './block_stats';

const block = (blockedMs: number, overrides: Partial<DetectedBlock> = {}): DetectedBlock => ({
  phase: 'running',
  startedAt: 0,
  endedAt: blockedMs,
  blockedMs,
  report: true,
  suppressedBlocks: 0,
  ...overrides,
});

const thresholds = { starting: 300, running: 200 };

describe('BlockStats', () => {
  it('starts empty, with each phase threshold', () => {
    expect(new BlockStats(thresholds, 1000).snapshot(1000)).toEqual({
      periodMs: 0,
      starting: {
        thresholdMs: 300,
        blocks: 0,
        suppressed: 0,
        maxBlockedMs: 0,
        buckets: { lt1s: 0, lt2s: 0, lt5s: 0, gte5s: 0 },
      },
      running: {
        thresholdMs: 200,
        blocks: 0,
        suppressed: 0,
        maxBlockedMs: 0,
        buckets: { lt1s: 0, lt2s: 0, lt5s: 0, gte5s: 0 },
      },
    });
  });

  it.each([
    [200, 'lt1s'],
    [999, 'lt1s'],
    [1000, 'lt2s'],
    [1999, 'lt2s'],
    [2000, 'lt5s'],
    [4999, 'lt5s'],
    [5000, 'gte5s'],
    [60_000, 'gte5s'],
  ] as const)('counts a %sms block in %s', (blockedMs, bucket) => {
    const stats = new BlockStats(thresholds, 0);
    stats.record(block(blockedMs));
    expect(stats.snapshot(0).running.buckets).toEqual({
      lt1s: 0,
      lt2s: 0,
      lt5s: 0,
      gte5s: 0,
      [bucket]: 1,
    });
  });

  it('tracks blocks, suppressed blocks and the longest block per phase', () => {
    const stats = new BlockStats(thresholds, 0);
    stats.record(block(300, { phase: 'starting' }));
    stats.record(block(2500, { phase: 'starting', report: false }));
    stats.record(block(700));

    const { starting, running } = stats.snapshot(0);
    expect(starting).toMatchObject({ blocks: 2, suppressed: 1, maxBlockedMs: 2500 });
    expect(starting.buckets).toEqual({ lt1s: 1, lt2s: 0, lt5s: 1, gte5s: 0 });
    expect(running).toMatchObject({ blocks: 1, suppressed: 0, maxBlockedMs: 700 });
  });

  it('carries counts over until reset', () => {
    const stats = new BlockStats(thresholds, 0);
    stats.record(block(300));
    stats.snapshot(600_000);
    stats.record(block(400));
    expect(stats.snapshot(1_200_000)).toMatchObject({
      periodMs: 1_200_000,
      running: { blocks: 2 },
    });
  });

  it('starts a new period on reset', () => {
    const stats = new BlockStats(thresholds, 0);
    stats.record(block(300));
    stats.reset(600_000);
    expect(stats.snapshot(700_000)).toMatchObject({
      periodMs: 100_000,
      running: { thresholdMs: 200, blocks: 0, maxBlockedMs: 0 },
    });
  });

  it('returns a snapshot later records do not change', () => {
    const stats = new BlockStats(thresholds, 0);
    const snapshot = stats.snapshot(0);
    stats.record(block(300));
    expect(snapshot.running.blocks).toBe(0);
    expect(snapshot.running.buckets.lt1s).toBe(0);
  });
});
