/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BlockDetector, REPORT_BURST, REPORT_REFILL_MS } from './block_detector';

describe('BlockDetector', () => {
  it('exposes when the ongoing block started, while blocked', () => {
    const detector = new BlockDetector(200);
    detector.poll(150, 0);
    expect(detector.blockedSince).toBeUndefined(); // not yet a block
    detector.poll(250, 0);
    expect(detector.blockedSince).toBe(0);
    detector.poll(1000, 950);
    expect(detector.blockedSince).toBeUndefined();
  });

  it('reports a block once the heartbeat resumes', () => {
    const detector = new BlockDetector(200);
    expect(detector.poll(150, 0)).toBeUndefined();
    expect(detector.poll(250, 0)).toBeUndefined();
    expect(detector.poll(900, 0)).toBeUndefined();
    expect(detector.poll(1000, 950)).toEqual({
      startedAt: 0,
      endedAt: 950,
      blockedMs: 950,
      report: true,
      suppressedBlocks: 0,
    });
    expect(detector.poll(1010, 1000)).toBeUndefined();
  });

  it('rate limits reports, counting suppressed blocks', () => {
    const detector = new BlockDetector(200);
    const block = (at: number) => {
      detector.poll(at + 300, at);
      return detector.poll(at + 310, at + 300)!;
    };
    for (let i = 0; i < REPORT_BURST; i++) expect(block(i * 1000).report).toBe(true);
    expect(block(10_000)).toMatchObject({ report: false });
    expect(block(11_000)).toMatchObject({ report: false });
    expect(block(10_000 + REPORT_REFILL_MS)).toMatchObject({ report: true, suppressedBlocks: 2 });
  });
});
