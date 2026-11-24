/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastIsEqual from 'fast-deep-equal';
import moment from 'moment';
import { COMPARE_ALL_OPTIONS, compareFilters } from '@kbn/es-query';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { Logger } from '@kbn/logging';
import type { StateComparators } from '@kbn/presentation-publishing';

export type UnifiedSearchState = Pick<
  DashboardState,
  'filters' | 'query' | 'refresh_interval' | 'time_range'
>;

const normalizeTime = (time?: string): string | undefined => {
  if (time === undefined) return undefined;
  // Parse strictly as ISO 8601: without an explicit format, moment falls back to
  // `new Date()` for relative times like 'now-7d' and logs a deprecation warning.
  const parsed = moment(time, moment.ISO_8601);
  // Relative times (e.g. 'now-15m') are not ISO dates and are compared as written.
  return parsed.isValid() ? parsed.toISOString() : time;
};

export const areTimesEqual = (timeA?: string, timeB?: string): boolean => {
  return normalizeTime(timeA) === normalizeTime(timeB);
};

/**
 * @param isTimeRestored Time range and refresh interval only count as changes when time is restored with the dashboard.
 * @param logger Optional logger used when converting filters.
 */
export function getUnifiedSearchComparators(
  isTimeRestored: () => boolean,
  logger?: Logger
): StateComparators<UnifiedSearchState> {
  return {
    filters: (a, b) =>
      compareFilters(
        toStoredFilters(a, logger) ?? [],
        toStoredFilters(b, logger) ?? [],
        COMPARE_ALL_OPTIONS
      ),
    query: 'deepEquality',
    refresh_interval: (a: UnifiedSearchState['refresh_interval'], b) =>
      isTimeRestored() ? fastIsEqual(a, b) : true,
    time_range: (a: UnifiedSearchState['time_range'], b) => {
      if (!isTimeRestored()) return true; // if time restore is set to false, time range doesn't count as a change.
      return areTimesEqual(a?.from, b?.from) && areTimesEqual(a?.to, b?.to);
    },
  } as StateComparators<UnifiedSearchState>;
}
