/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { keys, partition } from 'lodash';
import { Filter, isRangeFilter, RangeFilter, TimeRange } from '../../../../common';
import { convertRangeFilterToTimeRangeString } from './change_time_filter';

export function extractTimeFilter(timeFieldName: string, filters: Filter[]) {
  const [timeRangeFilter, restOfFilters] = partition(filters, (obj: Filter) => {
    let key;

    if (isRangeFilter(obj)) {
      key = keys(obj.range)[0];
    }

    return Boolean(key && key === timeFieldName);
  });

  return {
    restOfFilters,
    timeRangeFilter: timeRangeFilter[0] as RangeFilter | undefined,
  };
}

export function extractTimeRange(
  filters: Filter[],
  timeFieldName?: string
): { restOfFilters: Filter[]; timeRange?: TimeRange } {
  if (!timeFieldName) return { restOfFilters: filters, timeRange: undefined };
  const { timeRangeFilter, restOfFilters } = extractTimeFilter(timeFieldName, filters);
  return {
    restOfFilters,
    timeRange: timeRangeFilter ? convertRangeFilterToTimeRangeString(timeRangeFilter) : undefined,
  };
}
