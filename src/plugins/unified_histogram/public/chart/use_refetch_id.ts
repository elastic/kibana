/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { cloneDeep, isEqual } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessage } from '../messaging';
import {
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramChartContext,
  UnifiedHistogramHitsContext,
  UnifiedHistogramInput$,
  UnifiedHistogramRequestContext,
} from '../types';

export const useRefetchId = ({
  dataView,
  request,
  hits,
  chart,
  chartVisible,
  breakdown,
  filters,
  query,
  relativeTimeRange,
  input$,
}: {
  dataView: DataView;
  request: UnifiedHistogramRequestContext | undefined;
  hits: UnifiedHistogramHitsContext | undefined;
  chart: UnifiedHistogramChartContext | undefined;
  chartVisible: boolean;
  breakdown: UnifiedHistogramBreakdownContext | undefined;
  filters: Filter[];
  query: Query | AggregateQuery;
  relativeTimeRange: TimeRange;
  input$?: UnifiedHistogramInput$;
}) => {
  const refetchDeps = useRef<ReturnType<typeof getRefetchDeps>>();
  const [refetchId, setRefetchId] = useState(0);

  // When the unified histogram props change, we must compare the current subset
  // that should trigger a histogram refetch against the previous subset. If they
  // are different, we must refetch the histogram to ensure it's up to date.
  useEffect(() => {
    const newRefetchDeps = getRefetchDeps({
      dataView,
      request,
      hits,
      chart,
      chartVisible,
      breakdown,
      filters,
      query,
      relativeTimeRange,
    });

    if (!isEqual(refetchDeps.current, newRefetchDeps)) {
      if (refetchDeps.current) {
        setRefetchId((id) => id + 1);
      }

      refetchDeps.current = newRefetchDeps;
    }
  }, [breakdown, chart, chartVisible, dataView, filters, hits, query, request, relativeTimeRange]);

  const incrementRefetchId = useCallback(() => {
    setRefetchId((id) => id + 1);
  }, []);

  useMessage(input$, 'refetch', incrementRefetchId);

  return refetchId;
};

const getRefetchDeps = ({
  dataView,
  request,
  hits,
  chart,
  chartVisible,
  breakdown,
  filters,
  query,
  relativeTimeRange,
}: {
  dataView: DataView;
  request: UnifiedHistogramRequestContext | undefined;
  hits: UnifiedHistogramHitsContext | undefined;
  chart: UnifiedHistogramChartContext | undefined;
  chartVisible: boolean;
  breakdown: UnifiedHistogramBreakdownContext | undefined;
  filters: Filter[];
  query: Query | AggregateQuery;
  relativeTimeRange: TimeRange;
}) =>
  cloneDeep([
    dataView.id,
    request?.searchSessionId,
    Boolean(hits),
    chartVisible,
    chart?.timeInterval,
    Boolean(breakdown),
    breakdown?.field,
    filters,
    query,
    relativeTimeRange,
  ]);
