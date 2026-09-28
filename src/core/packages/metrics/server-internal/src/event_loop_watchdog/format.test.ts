/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatCandidates, formatLogLine, formatReportMessage } from './format';
import type { BlockReport } from './types';

const candidate = {
  kind: 'task' as const,
  type: 'alerting:.es-query',
  id: 't1',
  startedBeforeBlockMs: 40,
};
const now = new Date('2026-09-28T12:00:00.000Z');

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
    profile: {
      verdict: 'profiled',
      reason: 'JS samples cover 99% of the profiled 700ms of the block',
      frames: [
        {
          functionName: 'loop',
          location: 'src/a.js:3',
          selfTimeMs: 690,
          selfPercent: 98.6,
          callers: ['run (src/b.js:9)'],
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
  };

  it('only presents the start acknowledgement latency as added stall for profiled blocks', () => {
    const profiled = { ...report, profile: { ...report.profile, startAckLatencyMs: 700 } };
    expect(formatReportMessage(profiled)).toContain(
      'Profile profiled (starting the profiler added up to ~700ms to the block)'
    );
    const inconclusive = {
      ...report,
      profile: {
        verdict: 'inconclusive' as const,
        reason: 'r',
        frames: [],
        startAckLatencyMs: 900,
      },
    };
    expect(formatReportMessage(inconclusive)).toContain(
      'Profile inconclusive (profiler start acknowledged after ~900ms): r.'
    );
  });

  it('summarises verdict, frames, candidates and suppressed blocks', () => {
    expect(formatReportMessage(report)).toMatchInlineSnapshot(
      `"Event loop was blocked for ~1200ms, process CPU ratio 0.98. Profile profiled: JS samples cover 99% of the profiled 700ms of the block. Top frames: loop (src/a.js:3) 690ms 98.6% via run (src/b.js:9); (garbage collector) 10ms 1.4%. Candidates (in flight, not necessarily the cause): task alerting:.es-query [t1] (started 40ms before the block). 3 earlier block(s) were not reported."`
    );
  });
});

describe('formatLogLine', () => {
  it('writes ECS JSON lines', () => {
    const line = formatLogLine(
      'json',
      'metrics.event_loop_watchdog',
      'msg',
      { kibana: { a: 1 } },
      now
    );
    expect(line.endsWith('\n')).toBe(true);
    expect(JSON.parse(line)).toEqual({
      '@timestamp': '2026-09-28T12:00:00.000Z',
      ecs: { version: expect.any(String) },
      log: { level: 'WARN', logger: 'metrics.event_loop_watchdog' },
      message: 'msg',
      process: { pid: process.pid, uptime: expect.any(Number) },
      kibana: { a: 1 },
    });
  });

  it('writes plain text lines', () => {
    expect(formatLogLine('text', 'metrics.event_loop_watchdog', 'msg', {}, now)).toBe(
      '[2026-09-28T12:00:00.000Z][WARN ][metrics.event_loop_watchdog] msg\n'
    );
  });
});
