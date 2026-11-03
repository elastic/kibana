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
import { ONGOING_REPORT_AFTER_MS, REPORT_BURST, REPORT_REFILL_MS } from './constants';

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

  it('exposes the start of the ongoing block', () => {
    const detector = new BlockDetector();
    detector.poll(100, 0, running);
    expect(detector.ongoingStartedAt).toBeUndefined();
    detector.poll(300, 0, running);
    expect(detector.ongoingStartedAt).toBe(0);
    detector.poll(400, 350, running);
    expect(detector.ongoingStartedAt).toBeUndefined();
  });

  it('reports an ongoing block once it has lasted the ongoing mark, then every refill interval', () => {
    const detector = new BlockDetector();
    detector.poll(300, 0, running);
    expect(detector.poll(ONGOING_REPORT_AFTER_MS - 25, 0, running)).toBeUndefined();
    expect(detector.poll(ONGOING_REPORT_AFTER_MS, 0, running)).toEqual({
      phase: 'running',
      startedAt: 0,
      endedAt: ONGOING_REPORT_AFTER_MS,
      blockedMs: ONGOING_REPORT_AFTER_MS,
      report: true,
      suppressedBlocks: 0,
      ongoing: true,
    });
    expect(detector.poll(ONGOING_REPORT_AFTER_MS + 25, 0, running)).toBeUndefined();
    const repeatAt = ONGOING_REPORT_AFTER_MS + REPORT_REFILL_MS;
    expect(detector.poll(repeatAt - 25, 0, running)).toBeUndefined();
    expect(detector.poll(repeatAt, 0, running)).toMatchObject({
      blockedMs: repeatAt,
      report: true,
      ongoing: true,
    });
    expect(detector.poll(repeatAt + 100, repeatAt + 50, running)).toMatchObject({
      blockedMs: repeatAt + 50,
      report: true,
      ongoing: false,
    });
    expect(detector.poll(repeatAt + 200, repeatAt + 150, running)).toBeUndefined();
  });

  it('waits for the phase threshold when that is longer than the ongoing mark', () => {
    const detector = new BlockDetector();
    const slow: PollContext = { thresholdMs: 2 * ONGOING_REPORT_AFTER_MS, phase: 'starting' };
    expect(detector.poll(ONGOING_REPORT_AFTER_MS, 0, slow)).toBeUndefined();
    // Detected and reported on the same poll.
    expect(detector.poll(2 * ONGOING_REPORT_AFTER_MS, 0, slow)).toMatchObject({
      blockedMs: 2 * ONGOING_REPORT_AFTER_MS,
      ongoing: true,
    });
  });

  it('takes one token per block: the end of a block reported while ongoing is free', () => {
    const detector = new BlockDetector();
    const shortBlock = (at: number) => {
      detector.poll(at + 300, at, running);
      return detector.poll(at + 310, at + 300, running)!;
    };
    // A long block first: its ongoing report takes one token, its end report none.
    detector.poll(300, 0, running);
    expect(detector.poll(ONGOING_REPORT_AFTER_MS, 0, running)).toMatchObject({
      report: true,
      ongoing: true,
    });
    expect(detector.poll(3000, 2950, running)).toMatchObject({
      report: true,
      suppressedBlocks: 0,
      ongoing: false,
    });
    // The other tokens of the burst are all still there.
    for (let i = 1; i < REPORT_BURST; i++) {
      expect(shortBlock(3000 + i * 1000).report).toBe(true);
    }
    expect(shortBlock(3000 + REPORT_BURST * 1000)).toMatchObject({ report: false });
  });

  it('retries a suppressed ongoing report as soon as a token refills', () => {
    const detector = new BlockDetector();
    const shortBlock = (at: number) => {
      detector.poll(at + 300, at, running);
      return detector.poll(at + 310, at + 300, running)!;
    };
    // The bucket's refill clock starts at the first report, at 310.
    for (let i = 0; i < REPORT_BURST; i++) {
      shortBlock(i * 1000);
    }
    const startedAt = 10_000;
    detector.poll(startedAt + 300, startedAt, running);
    expect(detector.poll(startedAt + ONGOING_REPORT_AFTER_MS, startedAt, running)).toMatchObject({
      report: false,
      ongoing: true,
    });
    const refillAt = 310 + REPORT_REFILL_MS;
    expect(detector.poll(refillAt - 25, startedAt, running)).toBeUndefined();
    expect(detector.poll(refillAt, startedAt, running)).toMatchObject({
      blockedMs: refillAt - startedAt,
      report: true,
      ongoing: true,
    });
    // Reported while ongoing after all, so the end report is free.
    expect(detector.poll(refillAt + 100, refillAt + 50, running)).toMatchObject({
      report: true,
      ongoing: false,
    });
  });

  it('takes a token for each repeated ongoing report', () => {
    const detector = new BlockDetector();
    const shortBlock = (at: number) => {
      detector.poll(at + 300, at, running);
      return detector.poll(at + 310, at + 300, running)!;
    };
    for (let i = 1; i < REPORT_BURST; i++) {
      shortBlock(i * 1000);
    }
    // The last token goes to the ongoing report, the one refill to its repeat.
    const startedAt = REPORT_BURST * 1000;
    detector.poll(startedAt + 300, startedAt, running);
    expect(detector.poll(startedAt + ONGOING_REPORT_AFTER_MS, startedAt, running)).toMatchObject({
      report: true,
      ongoing: true,
    });
    const repeatAt = startedAt + ONGOING_REPORT_AFTER_MS + REPORT_REFILL_MS;
    expect(detector.poll(repeatAt, startedAt, running)).toMatchObject({
      report: true,
      ongoing: true,
    });
    detector.poll(repeatAt + 100, repeatAt + 50, running);
    expect(shortBlock(repeatAt + 1000)).toMatchObject({ report: false });
  });

  it('suppresses the ongoing report when the bucket is empty, without counting a suppressed block', () => {
    const detector = new BlockDetector();
    const shortBlock = (at: number) => {
      detector.poll(at + 300, at, running);
      return detector.poll(at + 310, at + 300, running)!;
    };
    for (let i = 0; i < REPORT_BURST; i++) {
      shortBlock(i * 1000);
    }
    detector.poll(10_300, 10_000, running);
    expect(detector.poll(10_000 + ONGOING_REPORT_AFTER_MS, 10_000, running)).toMatchObject({
      report: false,
      ongoing: true,
    });
    // The end report takes the normal path: suppressed too, and counted once.
    expect(detector.poll(13_000, 12_950, running)).toMatchObject({
      report: false,
      ongoing: false,
    });
    expect(shortBlock(10_000 + REPORT_REFILL_MS)).toMatchObject({
      report: true,
      suppressedBlocks: 1,
    });
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
});
