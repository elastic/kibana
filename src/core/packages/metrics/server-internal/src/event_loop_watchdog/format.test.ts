/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { describeCpuRatio, formatCandidates, formatReportMessage } from './format';
import type { BlockReport } from './types';

const candidate = {
  kind: 'task' as const,
  type: 'alerting:.es-query',
  id: 't1',
  startedBeforeBlockMs: 40,
};

describe('formatCandidates', () => {
  it('lists candidates and omitted counts', () => {
    expect(formatCandidates([], 0)).toBe('none tracked');
    expect(formatCandidates([candidate], 2)).toBe(
      'task alerting:.es-query [t1] (started 40ms before the block) and 2 more'
    );
  });
});

describe('formatReportMessage', () => {
  const report: BlockReport = {
    blockedMs: 1200,
    startedAt: 0,
    endedAt: 1200,
    cpuRatio: 0.98,
    liveNotices: 0,
    suppressedBlocks: 3,
    candidates: [candidate],
    omittedCandidates: 0,
  };

  it('summarises duration, CPU ratio, candidates and suppressed blocks', () => {
    expect(formatReportMessage(report)).toMatchInlineSnapshot(
      `"Event loop was blocked for ~1200ms (process CPU ratio 0.98: likely CPU-bound work on the main thread). Candidates (in flight, not necessarily the cause): task alerting:.es-query [t1] (started 40ms before the block). 3 earlier block(s) were not reported."`
    );
  });
});

describe('formatReportMessage with a profile', () => {
  const base: BlockReport = {
    blockedMs: 3200,
    startedAt: 0,
    endedAt: 3200,
    cpuRatio: 0.99,
    liveNotices: 0,
    suppressedBlocks: 0,
    candidates: [],
    omittedCandidates: 0,
  };

  it('lists top frames with callers and the profiler start cost', () => {
    const message = formatReportMessage({
      ...base,
      profile: {
        verdict: 'profiled',
        reason: 'JS samples cover 99% of the profiled 1100ms of the block',
        startAckLatencyMs: 700,
        frames: [
          {
            functionName: 'loop',
            location: 'src/a.js:3',
            selfTimeMs: 690,
            selfPercent: 98.6,
            callers: ['run (src/b.js:9)', 'main (src/c.js:1)'],
          },
          {
            functionName: '(garbage collector)',
            location: '',
            selfTimeMs: 10,
            selfPercent: 1.4,
            callers: [],
          },
        ],
      },
    });
    expect(message).toContain(
      'Profile profiled (starting the profiler added up to ~700ms to the block): JS samples cover 99% of the profiled 1100ms of the block. Top frames: loop (src/a.js:3) 690ms 98.6% via run (src/b.js:9) < main (src/c.js:1); (garbage collector) 10ms 1.4%.'
    );
  });

  it('does not present the acknowledgement delay as added stall for other verdicts', () => {
    const message = formatReportMessage({
      ...base,
      profile: { verdict: 'inconclusive', reason: 'r', frames: [], startAckLatencyMs: 900 },
    });
    expect(message).toContain(
      'Profile inconclusive (profiler start acknowledged after ~900ms): r.'
    );
  });
});

describe('describeCpuRatio', () => {
  it.each([
    [1.1, 'likely CPU-bound work on the main thread'],
    [0.05, 'likely waiting on a synchronous syscall or I/O'],
    [0.5, 'mixed CPU work and waiting'],
  ])('describes %s', (ratio, description) => {
    expect(describeCpuRatio(ratio)).toBe(description);
  });
});
