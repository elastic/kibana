/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastIsEqual from 'fast-deep-equal';
import type { Moment } from 'moment';
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

const convertTimeToUTCString = (time?: string | Moment): undefined | string => {
  if (moment(time).isValid()) {
    return moment(time).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  } else {
    // If it's not a valid moment date, then it should be a string representing a relative time
    // like 'now' or 'now-15m'.
    return time as string;
  }
};

export const areTimesEqual = (
  timeA?: string | Moment | undefined,
  timeB?: string | Moment | undefined
) => {
  return convertTimeToUTCString(timeA) === convertTimeToUTCString(timeB);
};

/**
 * @param isTimeRestored Time range and refresh interval only count as changes when time is restored with the dashboard.
 * @param logger Optional logger used when converting filters.
 */
export function getUnifiedSearchComparators({
  isTimeRestored,
  logger,
}: {
  isTimeRestored: () => boolean;
  logger?: Logger;
}): StateComparators<UnifiedSearchState> {
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
