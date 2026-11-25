/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import { isEqual } from 'lodash';
import dateMath from '@kbn/datemath';
import type { TimeRange } from '@kbn/es-query';
import type { TraceSource } from '@kbn/trace-latency-map';

/**
 * Discover re-resolves relative ranges ("now") on every fetch, so the absolute range
 * moves by seconds whenever the query changes. Shifts below this share of the range
 * count as the same range.
 */
const SAME_RANGE_TOLERANCE = 0.02;

/**
 * The drift the tolerance absorbs is seconds between two fetches of one query change;
 * without a cap, 2% of a months-long window would also swallow deliberate edits of an
 * absolute range, leaving the map on a different range than the documents.
 */
const SAME_RANGE_TOLERANCE_MAX_MS = 60_000;

/** Whether a range as the time picker holds it is relative, so each fetch resolves it anew. */
const isRelativeRange = (range?: TimeRange) =>
  Boolean(range && (range.from.includes('now') || range.to.includes('now')));

export function isSameTraceSource(
  previous: TraceSource,
  next: TraceSource,
  { driftTolerated = true }: { driftTolerated?: boolean } = {}
): boolean {
  const tolerance = driftTolerated
    ? Math.min(
        (Date.parse(next.timeRange.to) - Date.parse(next.timeRange.from)) * SAME_RANGE_TOLERANCE,
        SAME_RANGE_TOLERANCE_MAX_MS
      )
    : 0;
  return (
    previous.indexPattern === next.indexPattern &&
    previous.contextKey === next.contextKey &&
    isEqual(previous.filters, next.filters) &&
    Math.abs(Date.parse(previous.timeRange.from) - Date.parse(next.timeRange.from)) <= tolerance &&
    Math.abs(Date.parse(previous.timeRange.to) - Date.parse(next.timeRange.to)) <= tolerance
  );
}

/**
 * The latency map source for the current Discover state. Returns the previous object
 * when nothing that changes the map has changed, so a new selection never refetches it.
 * Drift is tolerated only while the time picker holds a relative range, which each fetch
 * resolves anew: an absolute range moves only when the user moves it, by however little.
 */
export function useStableTraceSource({
  indexPattern,
  filters,
  timeFrom,
  timeTo,
  relativeTimeRange,
  contextKey,
}: {
  indexPattern: string;
  filters: string[];
  timeFrom?: string;
  timeTo?: string;
  /** The range as the time picker holds it, relative or absolute. */
  relativeTimeRange?: TimeRange;
  /** Whatever else the host applies to the map's queries, as an opaque key. */
  contextKey?: string;
}): TraceSource | undefined {
  const previous = useRef<TraceSource>();
  const driftTolerated = isRelativeRange(relativeTimeRange);
  return useMemo(() => {
    if (!timeFrom || !timeTo) return undefined;
    const from = dateMath.parse(timeFrom);
    const to = dateMath.parse(timeTo, { roundUp: true });
    if (!from?.isValid() || !to?.isValid()) return undefined;
    const next: TraceSource = {
      indexPattern,
      filters,
      timeRange: { from: from.toISOString(), to: to.toISOString() },
      ...(contextKey !== undefined ? { contextKey } : {}),
    };
    if (previous.current && isSameTraceSource(previous.current, next, { driftTolerated })) {
      return previous.current;
    }
    previous.current = next;
    return next;
  }, [indexPattern, filters, timeFrom, timeTo, driftTolerated, contextKey]);
}
