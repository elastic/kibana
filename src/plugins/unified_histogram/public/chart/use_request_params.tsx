/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { useMemo } from 'react';
import type { UnifiedHistogramRequestContext, UnifiedHistogramServices } from '../types';

export const useRequestParams = ({
  services,
  query: originalQuery,
  filters: originalFilters,
  timeRange,
  lastReloadRequestTime,
  request,
}: {
  services: UnifiedHistogramServices;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  timeRange?: TimeRange;
  lastReloadRequestTime: number | undefined;
  request?: UnifiedHistogramRequestContext;
}) => {
  const { data } = services;

  const filters = useMemo(() => originalFilters ?? [], [originalFilters]);

  const query = useMemo(
    () => originalQuery ?? data.query.queryString.getDefaultQuery(),
    [data.query.queryString, originalQuery]
  );

  const relativeTimeRange = useMemo(
    () => timeRange ?? data.query.timefilter.timefilter.getTimeDefaults(),
    [data.query.timefilter.timefilter, timeRange]
  );

  return { filters, query, relativeTimeRange };
};
