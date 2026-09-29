/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { describeCpuRatio, formatCandidates, formatLogLine, formatReportMessage } from './format';
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
  };

  it('summarises duration, CPU ratio, candidates and suppressed blocks', () => {
    expect(formatReportMessage(report)).toMatchInlineSnapshot(
      `"Event loop was blocked for ~1200ms (process CPU ratio 0.98: likely CPU-bound work on the main thread). Candidates (in flight, not necessarily the cause): task alerting:.es-query [t1] (started 40ms before the block). 3 earlier block(s) were not reported."`
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
