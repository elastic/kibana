/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import type { ActivityBucket } from '../activity_increase';
import { ACTIVITY_INTERVAL_DETECTOR_CONFIG } from './detect_activity_interval';
import type { TimeWindow } from './history_plan';
import {
  getInternalIntervalCandidates,
  prefixSums,
  type InternalIntervalCandidate,
} from './internal_reference';
import { isValidActivitySeries, type ActivitySeriesKind } from './interval_score';

const DAY_MS = 86_400_000;
const MAX_HISTORY_DAYS = 42;

export interface DailyIntervalReference extends TimeWindow {
  readonly start: number;
  readonly end: number;
  readonly daysAgo: number;
}

export type DailyReferenceLookup = (start: number, end: number) => DailyIntervalReference | null;

/** Reads at most one additional day, clipped to complete buckets at the observed source boundary. */
export const planExploratoryHistory = ({
  view,
  earliestMs,
  intervalMs,
  timeZone,
}: {
  view: TimeWindow;
  earliestMs: number | null;
  intervalMs: number;
  timeZone: string;
}): TimeWindow | undefined => {
  if (earliestMs === null || !Number.isFinite(earliestMs)) return undefined;
  const previousStart = moment.tz(view.fromMs, timeZone).subtract(1, 'day').valueOf();
  const previousEnd = Math.min(
    view.fromMs,
    moment.tz(view.toMs, timeZone).subtract(1, 'day').valueOf()
  );
  const fromMs =
    view.fromMs +
    Math.ceil((Math.max(previousStart, earliestMs) - view.fromMs) / intervalMs) * intervalMs;
  const toMs =
    view.fromMs + Math.floor((previousEnd - view.fromMs) / intervalMs) * intervalMs;

  return fromMs < toMs ? { fromMs, toMs } : undefined;
};

/** Reuses prior buckets inside the view without ever comparing a candidate with itself or with future data. */
export const createDailyReferenceLookup = ({
  buckets,
  historyWindow,
  earliestMs,
  timeZone,
}: {
  buckets: readonly ActivityBucket[];
  historyWindow?: TimeWindow;
  earliestMs: number | null;
  timeZone: string;
}): DailyReferenceLookup => {
  if (!buckets.length) return () => null;
  const intervalMs = buckets[0].endTimeMs - buckets[0].startTimeMs;
  const historyCount = historyWindow
    ? Math.round((historyWindow.toMs - historyWindow.fromMs) / intervalMs)
    : 0;
  const starts = [
    ...Array.from(
      { length: historyCount },
      (_, index) => (historyWindow?.fromMs ?? 0) + index * intervalMs
    ),
    ...buckets.map(({ startTimeMs }) => startTimeMs),
  ];
  const indices = new Map(starts.map((time, index) => [time, index]));
  const cache = new Map<number, DailyIntervalReference | null>();

  return (start, end) => {
    const key = start * (buckets.length + 1) + end;
    if (cache.has(key)) return cache.get(key) ?? null;
    const from = buckets[start].startTimeMs;
    const to = buckets[end - 1].endTimeMs;
    let reference: DailyIntervalReference | null = null;
    // The previous day is preferred; longer candidates need an older, non-overlapping interval.
    const firstOffset = Math.max(1, Math.floor((to - from) / DAY_MS));
    for (let daysAgo = firstOffset; daysAgo <= MAX_HISTORY_DAYS; daysAgo++) {
      const fromMs = moment.tz(from, timeZone).subtract(daysAgo, 'days').valueOf();
      const toMs = moment.tz(to, timeZone).subtract(daysAgo, 'days').valueOf();
      if (toMs > from) continue;
      if (earliestMs === null || fromMs < earliestMs) break;
      const referenceStart = indices.get(fromMs);
      const last = indices.get(toMs - intervalMs);
      // The equal duration and contiguous grid checks reject clock changes and gaps, not turn them into zeros.
      if (
        toMs - fromMs === to - from &&
        referenceStart !== undefined &&
        last !== undefined &&
        last + 1 - referenceStart === end - start
      ) {
        reference = { fromMs, toMs, start: referenceStart, end: last + 1, daysAgo };
      }
      break;
    }
    cache.set(key, reference);
    return reference;
  };
};

export type ExploratoryIntervalDetection =
  | {
      readonly status: 'admitted';
      readonly candidate: InternalIntervalCandidate;
      readonly comparison: DailyIntervalReference;
      readonly historicalTotal: number;
      readonly score: number;
    }
  | { readonly status: 'none' | 'unassessable' };

/** Finds an internal increase above its earlier daily comparison, without assigning statistical significance. */
export const detectExploratoryActivityInterval = ({
  current,
  history,
  lookup,
  kind = 'counts',
}: {
  current: readonly number[];
  history: readonly number[];
  lookup: DailyReferenceLookup;
  kind?: ActivitySeriesKind;
}): ExploratoryIntervalDetection => {
  const combined = [...history, ...current];
  if (!isValidActivitySeries(combined, combined.length, kind)) {
    throw new Error('Expected complete nonnegative exploratory series');
  }
  const { candidates } = getInternalIntervalCandidates(current, ACTIVITY_INTERVAL_DETECTOR_CONFIG);
  const prefix = prefixSums(combined);
  let selected: Extract<ExploratoryIntervalDetection, { status: 'admitted' }> | undefined;
  let comparable = 0;
  for (const candidate of candidates) {
    const comparison = lookup(candidate.start, candidate.end);
    if (!comparison) continue;
    if (comparison.start < 0 || comparison.end >= prefix.length) {
      throw new Error('Incomplete exploratory reference');
    }
    comparable++;
    const historicalTotal = prefix[comparison.end] - prefix[comparison.start];
    if (candidate.observed <= historicalTotal) continue;
    // Dimensionless ordering, also defined when the earlier measured count was zero; this is not a p-value.
    const score = 1 - historicalTotal / candidate.observed;
    if (!selected || score > selected.score) {
      selected = { status: 'admitted', candidate, comparison, historicalTotal, score };
    }
  }
  return selected ?? { status: candidates.length && !comparable ? 'unassessable' : 'none' };
};
