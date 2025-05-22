/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRangeFilter, type Filter, type RangeFilter } from '../build_filters';
import type { TimeRange } from './types';
import { convertRangeFilterToTimeRangeString } from './convert_range_filter';

export function extractTimeFilter(
  timeFieldName: string,
  filters: Filter[]
): { restOfFilters: Filter[]; timeRangeFilter?: RangeFilter } {
  const restOfFilters = filters.filter((f) => !isRangeFilter(f));
  const timeRangeFilter = filters.find(
    (f): f is RangeFilter => isRangeFilter(f) && timeFieldName === Object.keys(f.query.range)[0]
  );

  return {
    restOfFilters,
    timeRangeFilter,
  };
}

export function extractTimeRange(
  filters: Filter[],
  timeFieldName?: string
): { restOfFilters: Filter[]; timeRange?: TimeRange } {
  if (!timeFieldName) {
    return { restOfFilters: filters };
  }
  const { timeRangeFilter, restOfFilters } = extractTimeFilter(timeFieldName, filters);
  return {
    restOfFilters,
    timeRange: timeRangeFilter ? convertRangeFilterToTimeRangeString(timeRangeFilter) : undefined,
  };
}
