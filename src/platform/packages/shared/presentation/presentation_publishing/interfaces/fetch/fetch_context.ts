/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { COMPARE_ALL_OPTIONS, onlyDisabledFiltersChanged } from '@kbn/es-query';
import fastIsEqual from 'fast-deep-equal';

export interface FetchContext {
  isReload: boolean;
  filters: Filter[] | undefined;
  query: Query | AggregateQuery | undefined;
  searchSessionId: string | undefined;
  timeRange: TimeRange | undefined;
  timeslice: [number, number] | undefined;
}

export interface ReloadTimeFetchContext extends Omit<FetchContext, 'isReload'> {
  reloadTimestamp?: number;
}

export function isReloadTimeFetchContextEqual(
  currentContext: ReloadTimeFetchContext,
  lastContext: ReloadTimeFetchContext
): boolean {
  return (
    isReloadTimestampEqualForFetch(currentContext.reloadTimestamp, lastContext.reloadTimestamp) &&
    areFiltersEqualForFetch(currentContext.filters, lastContext.filters) &&
    isQueryEqualForFetch(currentContext.query, lastContext.query) &&
    isTimeRangeEqualForFetch(currentContext.timeRange, lastContext.timeRange) &&
    isTimeSliceEqualForFetch(currentContext.timeslice, lastContext.timeslice)
  );
}

export const areFiltersEqualForFetch = (currentFilters?: Filter[], lastFilters?: Filter[]) => {
  return onlyDisabledFiltersChanged(currentFilters, lastFilters, {
    ...COMPARE_ALL_OPTIONS,
    // do not compare $state to avoid refreshing when filter is pinned/unpinned (which does not impact results)
    state: false,
  });
};

export const isReloadTimestampEqualForFetch = (
  currentReloadTimestamp?: number,
  lastReloadTimestamp?: number
) => {
  if (!currentReloadTimestamp) return true; // if current reload timestamp is not set, this is not a force refresh.
  return currentReloadTimestamp === lastReloadTimestamp;
};

export const isQueryEqualForFetch = (
  currentQuery: Query | AggregateQuery | undefined,
  lastQuery: Query | AggregateQuery | undefined
) => fastIsEqual(currentQuery, lastQuery);

export const isTimeRangeEqualForFetch = (
  currentTimeRange: TimeRange | undefined,
  lastTimeRange: TimeRange | undefined
) => fastIsEqual(currentTimeRange, lastTimeRange);

export const isTimeSliceEqualForFetch = (
  currentTimeslice: [number, number] | undefined,
  lastTimeslice: [number, number] | undefined
) => fastIsEqual(currentTimeslice, lastTimeslice);
