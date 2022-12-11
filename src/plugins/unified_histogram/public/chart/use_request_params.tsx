/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { useCallback, useMemo, useState } from 'react';
import { Observable } from 'rxjs';
import { useMessage } from '../messaging';
import type {
  UnifiedHistogramInputMessage,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
} from '../types';

export const useRequestParams = ({
  services,
  query: originalQuery,
  filters: originalFilters,
  timeRange: originalTimeRange,
  request,
  input$,
}: {
  services: UnifiedHistogramServices;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  timeRange?: TimeRange;
  request?: UnifiedHistogramRequestContext;
  input$: Observable<UnifiedHistogramInputMessage>;
}) => {
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

  const [timeRange, setTimeRange] = useState(getAbsoluteTimeRange(relativeTimeRange));
  const updateTimeRange = useCallback(
    () => setTimeRange(getAbsoluteTimeRange(relativeTimeRange)),
    [relativeTimeRange]
  );

  // We need to update the absolute time range whenever a refetch is triggered
  useMessage(input$, 'refetch', updateTimeRange);

  return { filters, query, timeRange, relativeTimeRange };
};
