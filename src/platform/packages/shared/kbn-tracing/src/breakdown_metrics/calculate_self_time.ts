/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { HrTime } from '@opentelemetry/api';
import { BreakdownMetricsEndedSpan, BreakdownMetricsSpanSelfActivity } from './types';

const MS_TO_NANO = 1e9;

function hrTimeToNs(time: HrTime) {
  return time[0] * MS_TO_NANO + time[1];
}

export function calculateSelfTime({
  span,
  activity,
}: {
  span: ReadableSpan;
  activity: BreakdownMetricsSpanSelfActivity;
}): number {
  /**
   *
   */
  const childActivities = activity.endedSpans.concat(
    Array.from(activity.runningSpans.values()).map((runningSpan): BreakdownMetricsEndedSpan => {
      return {
        start: runningSpan.startTime,
        end: span.endTime,
      };
    })
  );

  const parentStart = hrTimeToNs(span.startTime);
  const parentEnd = hrTimeToNs(span.endTime);

  interface Event {
    time: number;
    delta: 1 | -1 | 0;
  }
  /**
   * Creates events out of start and end time of spans, then walks
   * said events, keeping track of when there any children active
   * or not, and based on that, incrementing selfTime.
   */
  const events: Event[] = [];

  for (const { start, end } of childActivities) {
    events.push({ time: hrTimeToNs(start), delta: 1 });
    events.push({ time: hrTimeToNs(end), delta: -1 });
  }

  events.push({ time: parentStart, delta: 0 });
  events.push({ time: parentEnd, delta: 0 });
  events.sort((a, b) => a.time - b.time);

  let activeChildren = 0;
  let last = parentStart;
  let selfTime = 0;

  for (const { time, delta } of events) {
    if (time < parentStart || time > parentEnd) continue;

    if (activeChildren === 0) {
      // add diff between time of this event and last event
      // to selfTime
      selfTime += time - last;
    }

    activeChildren += delta;
    last = time;
  }

  return selfTime;
}
