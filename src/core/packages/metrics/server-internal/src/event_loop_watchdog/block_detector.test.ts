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
});
