/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PollContext } from './block_detector';
import { BlockDetector } from './block_detector';
import { REPORT_BURST, REPORT_REFILL_MS } from './constants';

const running: PollContext = { thresholdMs: 200, phase: 'running' };

describe('BlockDetector', () => {
  it('reports a block once the heartbeat resumes', () => {
    const detector = new BlockDetector();
    expect(detector.poll(150, 0, running)).toBeUndefined();
    expect(detector.poll(250, 0, running)).toBeUndefined();
    expect(detector.poll(900, 0, running)).toBeUndefined();
    expect(detector.poll(1000, 950, running)).toEqual({
      phase: 'running',
      startedAt: 0,
      endedAt: 950,
      blockedMs: 950,
      report: true,
      suppressedBlocks: 0,
      ongoing: false,
    });
    expect(detector.poll(1010, 1000, running)).toBeUndefined();
  });

  it('treats a stale heartbeat of exactly the threshold as a block', () => {
    const detector = new BlockDetector();
    detector.poll(199, 0, running);
    expect(detector.poll(260, 250, running)).toBeUndefined();
    detector.poll(450, 250, running);
    expect(detector.poll(470, 460, running)).toMatchObject({ startedAt: 250, blockedMs: 210 });
  });

  it('judges each poll against the threshold passed with it', () => {
    const detector = new BlockDetector();
    detector.poll(500, 0, { thresholdMs: 1000, phase: 'running' });
    expect(detector.poll(510, 500, running)).toBeUndefined();

    detector.poll(1000, 500, { thresholdMs: 400, phase: 'running' });
    expect(detector.poll(1010, 1000, running)).toMatchObject({ blockedMs: 500 });
  });

  it('keeps the phase the block started in', () => {
    const detector = new BlockDetector();
    detector.poll(300, 0, { thresholdMs: 200, phase: 'starting' });
    detector.poll(600, 0, running);
    expect(detector.poll(700, 650, running)).toMatchObject({ phase: 'starting' });
  });

  it('does not start a block below the threshold of the current phase', () => {
    const detector = new BlockDetector();
    detector.poll(300, 0, { thresholdMs: 500, phase: 'starting' });
    expect(detector.poll(310, 300, running)).toBeUndefined();
  });

  it('rate limits reports, counting suppressed blocks', () => {
    const detector = new BlockDetector();
    const block = (at: number) => {
      detector.poll(at + 300, at, running);
      return detector.poll(at + 310, at + 300, running)!;
    };
    for (let i = 0; i < REPORT_BURST; i++) {
      expect(block(i * 1000).report).toBe(true);
    }
    expect(block(10_000)).toMatchObject({ report: false });
    expect(block(11_000)).toMatchObject({ report: false });
    expect(block(10_000 + REPORT_REFILL_MS)).toMatchObject({ report: true, suppressedBlocks: 2 });
    expect(block(10_000 + 2 * REPORT_REFILL_MS)).toMatchObject({
      report: true,
      suppressedBlocks: 0,
    });
  });

  it('refills no more than the burst after a long idle stretch', () => {
    const detector = new BlockDetector();
    const block = (at: number) => {
      detector.poll(at + 300, at, running);
      return detector.poll(at + 310, at + 300, running)!;
    };
    for (let i = 0; i < REPORT_BURST; i++) {
      block(i * 1000);
    }
    const later = 10 * REPORT_REFILL_MS;
    for (let i = 0; i < REPORT_BURST; i++) {
      expect(block(later + i * 1000).report).toBe(true);
    }
    expect(block(later + REPORT_BURST * 1000).report).toBe(false);
  });

  describe('ongoing block', () => {
    it('is reported once it has lasted 2 s', () => {
      const detector = new BlockDetector();
      detector.poll(300, 0, running);
      expect(detector.poll(1975, 0, running)).toBeUndefined();
      expect(detector.poll(2000, 0, running)).toEqual({
        phase: 'running',
        startedAt: 0,
        endedAt: 2000,
        blockedMs: 2000,
        report: true,
        suppressedBlocks: 0,
        ongoing: true,
      });
      expect(detector.poll(2025, 0, running)).toBeUndefined();
    });

    it('is reported again every 3 s early on, then once a minute', () => {
      const detector = new BlockDetector();
      const reportedAt: number[] = [];
      for (let now = 25; now <= 80_000; now += 25) {
        const block = detector.poll(now, 0, running);
        if (block) {
          reportedAt.push(block.blockedMs);
        }
      }
      expect(reportedAt).toEqual([2000, 5000, 8000, 11000, 14000, 74000]);
    });

    it('is reported as soon as it is detected when the phase threshold is longer than 2 s', () => {
      const detector = new BlockDetector();
      expect(detector.poll(3000, 0, { thresholdMs: 3000, phase: 'running' })).toMatchObject({
        blockedMs: 3000,
        ongoing: true,
      });
    });

    it('is reported after short blocks used up the rate limit', () => {
      const detector = new BlockDetector();
      for (let i = 0; i <= REPORT_BURST; i++) {
        detector.poll(i * 1000 + 300, i * 1000, running);
        detector.poll(i * 1000 + 310, i * 1000 + 300, running);
      }
      const start = 10_000;
      detector.poll(start + 300, start, running);
      expect(detector.poll(start + 2000, start, running)).toMatchObject({
        report: true,
        ongoing: true,
      });
      // Its end still goes through the rate limit.
      expect(detector.poll(start + 2100, start + 2050, running)).toMatchObject({
        report: false,
        ongoing: false,
      });
    });

    it('takes no rate limit token while it is reported', () => {
      const detector = new BlockDetector();
      for (let now = 300; now <= 9000; now += 25) {
        detector.poll(now, 0, running);
      }
      expect(detector.poll(9010, 9000, running)).toMatchObject({ report: true, ongoing: false });
      for (let i = 1; i < REPORT_BURST; i++) {
        const at = 9000 + i * 1000;
        detector.poll(at + 300, at, running);
        expect(detector.poll(at + 310, at + 300, running)).toMatchObject({ report: true });
      }
    });
  });
});
