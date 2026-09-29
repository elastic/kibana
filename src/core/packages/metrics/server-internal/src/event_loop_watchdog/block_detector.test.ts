/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BlockDetector, REPORT_BURST, REPORT_REFILL_MS } from './block_detector';

const options = {
  thresholdMs: 500,
  liveNoticeIntervalMs: 1_000,
  maxLiveNoticesPerBlock: 2,
  profileAfterMs: 2_000,
  maxProfileDurationMs: 3_000,
  profileCooldownMs: 60_000,
};

describe('BlockDetector', () => {
  it('does nothing while the heartbeat is fresh', () => {
    const detector = new BlockDetector(options);
    expect(detector.poll(1_000, 900)).toEqual([]);
    expect(detector.isBlocked).toBe(false);
  });

  it('detects a block, emits bounded live notices, then ends it', () => {
    const detector = new BlockDetector(options);
    const heartbeat = 1_000;

    expect(detector.poll(1_500, heartbeat)).toEqual([
      { type: 'block-start', startedAt: 1_000, detectedAt: 1_500 },
    ]);
    expect(detector.isBlocked).toBe(true);
    expect(detector.poll(1_900, heartbeat)).toEqual([]);
    expect(detector.poll(2_000, heartbeat)).toEqual([
      { type: 'live-notice', startedAt: 1_000, elapsedMs: 1_000, count: 1 },
    ]);
    expect(detector.poll(3_000, heartbeat)).toEqual([
      { type: 'live-notice', startedAt: 1_000, elapsedMs: 2_000, count: 2 },
      { type: 'profile-start', blockId: expect.any(Number) },
    ]);
    // live notices are capped per block
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

  describe('profiling', () => {
    it('requests a capture once per block, only after profileAfter', () => {
      const detector = new BlockDetector({ ...options, liveNoticeIntervalMs: 100_000 });
      detector.poll(1_500, 1_000);
      expect(detector.poll(2_999, 1_000)).toEqual([]);
      expect(detector.poll(3_000, 1_000)).toEqual([
        { type: 'profile-start', blockId: expect.any(Number) },
      ]);
      expect(detector.poll(3_500, 1_000)).toEqual([]);
    });

    it('does not profile blocks shorter than profileAfter', () => {
      const detector = new BlockDetector(options);
      detector.poll(1_500, 1_000);
      expect(detector.poll(2_000, 1_900)).toEqual([
        expect.objectContaining({ type: 'block-end', blockedMs: 900 }),
      ]);
    });

    it('arms the deadline when the capture is acknowledged during the block', () => {
      const detector = new BlockDetector({ ...options, liveNoticeIntervalMs: 100_000 });
      detector.poll(1_500, 1_000);
      detector.poll(3_000, 1_000);
      detector.onCaptureStarted(3_100, 0);
      expect(detector.poll(6_000, 1_000)).toEqual([]);
      expect(detector.poll(6_100, 1_000)).toEqual([{ type: 'profile-deadline' }]);
      expect(detector.poll(7_000, 1_000)).toEqual([]);
    });

    it('applies the cooldown from the acknowledgement, even if it arrives after the block', () => {
      const detector = new BlockDetector({ ...options, liveNoticeIntervalMs: 100_000 });
      detector.poll(1_500, 1_000);
      detector.poll(3_000, 1_000); // profile-start
      detector.poll(3_100, 3_050); // block ends before the acknowledgement
      detector.onCaptureStarted(3_200, 0);

      detector.poll(4_000, 3_400);
      expect(detector.poll(5_500, 3_400)).toEqual([]); // cooldown applies
      detector.poll(5_600, 5_550);

      detector.poll(64_000, 63_400);
      expect(detector.poll(65_500, 63_400)).toEqual([
        { type: 'profile-start', blockId: expect.any(Number) },
      ]);
    });

    it('does not arm a later block with a late acknowledgement of an earlier capture', () => {
      const detector = new BlockDetector({
        ...options,
        liveNoticeIntervalMs: 100_000,
        profileCooldownMs: 0,
      });
      detector.poll(1_500, 1_000);
      detector.poll(3_000, 1_000); // block 0 requests a capture
      detector.poll(3_100, 3_050); // block 0 ends
      detector.poll(4_000, 3_400); // block 1 starts
      detector.onCaptureStarted(4_050, 0); // late acknowledgement for block 0
      expect(detector.poll(5_400, 3_400)).toEqual([{ type: 'profile-start', blockId: 1 }]);
      detector.onCaptureStarted(5_500, 1);
      expect(detector.poll(8_400, 3_400)).toEqual([]);
      expect(detector.poll(8_500, 3_400)).toEqual([{ type: 'profile-deadline' }]);
    });

    it('does not consume the cooldown when no capture is acknowledged', () => {
      const detector = new BlockDetector({ ...options, liveNoticeIntervalMs: 100_000 });
      detector.poll(1_500, 1_000);
      detector.poll(3_000, 1_000); // profile-start, but the worker skipped it
      detector.poll(3_100, 3_050);
      detector.poll(4_000, 3_400);
      expect(detector.poll(5_500, 3_400)).toEqual([
        { type: 'profile-start', blockId: expect.any(Number) },
      ]);
    });
  });

  it('rate limits reports and counts suppressed blocks', () => {
    const detector = new BlockDetector(options);
    let now = 1_000;
    const blockOnce = () => {
      detector.poll(now + 600, now);
      const [end] = detector.poll(now + 700, now + 650);
      if (end.type !== 'block-end') throw new Error('expected block-end');
      now += 1_000;
      return end;
    };

    const reports = Array.from({ length: REPORT_BURST }, () => blockOnce().report);
    expect(reports.every(Boolean)).toBe(true);
    expect(blockOnce().report).toBe(false);
    expect(blockOnce().report).toBe(false);

    now += REPORT_REFILL_MS;
    expect(blockOnce()).toEqual(expect.objectContaining({ report: true, suppressedBlocks: 2 }));
    expect(blockOnce().report).toBe(false);
  });
});
