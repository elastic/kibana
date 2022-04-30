/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, isRangeFilter, RangeFilter } from '@kbn/es-query';
import { keys, partition } from 'lodash';
import { TimeRange } from '../../../../common';
import { convertRangeFilterToTimeRangeString } from './change_time_filter';

export function extractTimeFilter(timeFieldName: string, filters: Filter[]) {
  const [timeRangeFilter, restOfFilters] = partition(filters, (obj: Filter) => {
    let key;

    if (isRangeFilter(obj)) {
      key = keys(obj.query.range)[0];
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
