/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HrTime } from '@opentelemetry/api';
import { Span } from '@opentelemetry/sdk-trace-base';

import { calculateSelfTime } from './calculate_self_time';
import { BreakdownMetricsSpanSelfActivity } from './types';

// Helper: convert milliseconds to an OpenTelemetry HrTime tuple
const msToHr = (ms: number): HrTime => {
  const seconds = Math.floor(ms / 1000);
  const nano = (ms - seconds * 1000) * 1e6;
  return [seconds, nano] as HrTime;
};

// Minimal stub for ReadableSpan – only the fields used by calculateSelfTime
const makeSpan = (startMs: number, endMs: number): Span =>
  ({
    startTime: msToHr(startMs),
    endTime: msToHr(endMs),
  } as unknown as Span);

describe('calculateSelfTime', () => {
  it('returns full duration when there are no child spans', () => {
    const span = makeSpan(0, 1000);
    const activity: BreakdownMetricsSpanSelfActivity = {
      endedSpans: [],
      runningSpans: new Map(),
    };

    const selfTime = calculateSelfTime({ span, activity });
    expect(selfTime).toBe(1e9); // 1000 ms => 1 000 000 000 ns
  });

  it('subtracts a single non-overlapping child span', () => {
    const span = makeSpan(0, 1000);
    const activity: BreakdownMetricsSpanSelfActivity = {
      endedSpans: [
        {
          start: msToHr(200),
          end: msToHr(400),
        },
      ],
      runningSpans: new Map(),
    };

    const selfTime = calculateSelfTime({ span, activity });
    expect(selfTime).toBe(600 * 1e6); // 600 ms
  });

  it('handles overlapping child spans correctly', () => {
    const span = makeSpan(0, 1000);
    const activity: BreakdownMetricsSpanSelfActivity = {
      endedSpans: [
        { start: msToHr(0), end: msToHr(500) },
        { start: msToHr(250), end: msToHr(750) },
      ],
      runningSpans: new Map(),
    };

    const selfTime = calculateSelfTime({ span, activity });
    expect(selfTime).toBe(250 * 1e6); // only 750-1000 ms free
  });

  it('accounts for running child spans (still open)', () => {
    const span = makeSpan(0, 1000);
    const runningChild = makeSpan(500, 0); // endTime ignored for running spans

    const activity: BreakdownMetricsSpanSelfActivity = {
      endedSpans: [],
      runningSpans: new Map([[{} as any, runningChild]]),
    };

    const selfTime = calculateSelfTime({ span, activity });
    expect(selfTime).toBe(500 * 1e6); // 0-500 ms free
  });
});
