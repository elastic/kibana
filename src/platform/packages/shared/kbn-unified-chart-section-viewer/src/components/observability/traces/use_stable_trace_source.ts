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
import type { TraceSource } from '@kbn/trace-latency-map';

/**
 * Discover re-resolves relative ranges ("now") on every fetch, so the absolute range
 * moves by seconds whenever the query changes. Shifts below this share of the range
 * count as the same range.
 */
const SAME_RANGE_TOLERANCE = 0.02;

export function isSameTraceSource(previous: TraceSource, next: TraceSource): boolean {
  const tolerance =
    (Date.parse(next.timeRange.to) - Date.parse(next.timeRange.from)) * SAME_RANGE_TOLERANCE;
  return (
    previous.indexPattern === next.indexPattern &&
    isEqual(previous.filters, next.filters) &&
    Math.abs(Date.parse(previous.timeRange.from) - Date.parse(next.timeRange.from)) < tolerance &&
    Math.abs(Date.parse(previous.timeRange.to) - Date.parse(next.timeRange.to)) < tolerance
  );
}

/**
 * The latency map source for the current Discover state. Returns the previous object
 * when nothing that changes the map has changed, so a new selection never refetches it.
 */
export function useStableTraceSource({
  indexPattern,
  filters,
  timeFrom,
  timeTo,
}: {
  indexPattern: string;
  filters: string[];
  timeFrom?: string;
  timeTo?: string;
}): TraceSource | undefined {
  const previous = useRef<TraceSource>();
  return useMemo(() => {
    if (!timeFrom || !timeTo) return undefined;
    const from = dateMath.parse(timeFrom);
    const to = dateMath.parse(timeTo, { roundUp: true });
    if (!from?.isValid() || !to?.isValid()) return undefined;
    const next: TraceSource = {
      indexPattern,
      filters,
      timeRange: { from: from.toISOString(), to: to.toISOString() },
    };
    if (previous.current && isSameTraceSource(previous.current, next)) return previous.current;
    previous.current = next;
    return next;
  }, [indexPattern, filters, timeFrom, timeTo]);
}
