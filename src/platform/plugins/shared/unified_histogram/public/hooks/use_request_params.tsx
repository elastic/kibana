/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { useCallback, useMemo, useRef } from 'react';
import type { UnifiedHistogramServices } from '../types';
import { useStableCallback } from './use_stable_callback';

export interface UseRequestParamsResult {
  query: Query | AggregateQuery;
  filters: Filter[];
  relativeTimeRange: TimeRange;
  getTimeRange: () => TimeRange;
  updateTimeRange: () => void;
}

export const useRequestParams = ({
  services,
  query: originalQuery,
  filters: originalFilters,
  timeRange: originalTimeRange,
}: {
  services: UnifiedHistogramServices;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  timeRange?: TimeRange;
}): UseRequestParamsResult => {
  const { data } = services;

  const filters = useMemo(() => originalFilters ?? [], [originalFilters]);

  const query = useMemo(
    () => originalQuery ?? data.query.queryString.getDefaultQuery(),
    [data.query.queryString, originalQuery]
  );

  const relativeTimeRange = useMemo(
    () => originalTimeRange ?? data.query.timefilter.timefilter.getTimeDefaults(),
    [data.query.timefilter.timefilter, originalTimeRange]
  );

  const timeRange = useRef(getAbsoluteTimeRange(relativeTimeRange));
  const getTimeRange = useCallback(() => timeRange.current, []);
  const updateTimeRange = useStableCallback(() => {
    timeRange.current = getAbsoluteTimeRange(relativeTimeRange);
  });

  return { filters, query, getTimeRange, updateTimeRange, relativeTimeRange };
};
