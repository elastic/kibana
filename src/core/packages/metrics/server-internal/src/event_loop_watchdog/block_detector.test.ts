/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BlockDetector, MIN_REPORT_REFILL_MS, REPORT_BURST } from './block_detector';

const options = {
  thresholdMs: 500,
  liveNoticeIntervalMs: 1_000,
  maxLiveNoticesPerBlock: 2,
  maxProfileDurationMs: 3_000,
  profileCooldownMs: 60_000,
};

describe('BlockDetector', () => {
  it('does nothing while the heartbeat is fresh', () => {
    const detector = new BlockDetector(options);
    expect(detector.poll(1_000, 900)).toEqual([]);
    expect(detector.isBlocked).toBe(false);
  });

  it('detects a block, emits bounded live notices and a profile deadline, then ends it', () => {
    const detector = new BlockDetector(options);
    const heartbeat = 1_000;

    expect(detector.poll(1_500, heartbeat)).toEqual([
      { type: 'block-start', startedAt: 1_000, detectedAt: 1_500, profile: true },
    ]);
    expect(detector.poll(1_900, heartbeat)).toEqual([]);
    expect(detector.poll(2_000, heartbeat)).toEqual([
      { type: 'live-notice', startedAt: 1_000, elapsedMs: 1_000, count: 1 },
    ]);
    expect(detector.poll(3_000, heartbeat)).toEqual([
      { type: 'live-notice', startedAt: 1_000, elapsedMs: 2_000, count: 2 },
    ]);
    // live notices are capped per block; the profile deadline fires once
    expect(detector.poll(4_500, heartbeat)).toEqual([{ type: 'profile-deadline' }]);
    expect(detector.poll(9_000, heartbeat)).toEqual([]);

    expect(detector.poll(9_100, 9_050)).toEqual([
      {
        type: 'block-end',
        startedAt: 1_000,
        endedAt: 9_050,
        blockedMs: 8_050,
        liveNotices: 2,
        report: true,
        suppressedBlocks: 0,
      },
    ]);
    expect(detector.isBlocked).toBe(false);
  });

  it('applies the profile cooldown to subsequent blocks', () => {
    const detector = new BlockDetector(options);
    expect(detector.poll(1_500, 1_000)).toEqual([expect.objectContaining({ profile: true })]);
    detector.poll(1_600, 1_550);
    expect(detector.poll(3_000, 2_000)).toEqual([expect.objectContaining({ profile: false })]);
    detector.poll(3_100, 3_050);
    expect(detector.poll(70_000, 65_000)).toEqual([expect.objectContaining({ profile: true })]);
  });

  it('rate limits reports and counts suppressed blocks', () => {
    const detector = new BlockDetector(options);
    const reports: boolean[] = [];
    let now = 1_000;
    const blockOnce = () => {
      detector.poll(now + 600, now);
      const [end] = detector.poll(now + 700, now + 650);
      if (end.type !== 'block-end') throw new Error('expected block-end');
      reports.push(end.report);
      now += 1_000;
      return end;
    };

    for (let i = 0; i < REPORT_BURST; i++) blockOnce();
    expect(blockOnce().report).toBe(false);
    expect(blockOnce().report).toBe(false);
    expect(reports.filter(Boolean)).toHaveLength(REPORT_BURST);

    now += options.profileCooldownMs;
    expect(blockOnce()).toEqual(expect.objectContaining({ report: true, suppressedBlocks: 2 }));
  });

  it('bounds reports even when the profile cooldown is disabled', () => {
    const detector = new BlockDetector({ ...options, profileCooldownMs: 0 });
    let now = 1_000;
    const results: boolean[] = [];
    for (let i = 0; i < REPORT_BURST + 3; i++) {
      detector.poll(now + 600, now);
      const [end] = detector.poll(now + 700, now + 650);
      if (end.type !== 'block-end') throw new Error('expected block-end');
      results.push(end.report);
      now += 1_000;
    }
    expect(results.filter(Boolean)).toHaveLength(REPORT_BURST);

    now += MIN_REPORT_REFILL_MS;
    detector.poll(now + 600, now);
    expect(detector.poll(now + 700, now + 650)).toEqual([
      expect.objectContaining({ report: true, suppressedBlocks: 3 }),
    ]);
  });
});
