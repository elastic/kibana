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
import { useEffect, useMemo, useRef } from 'react';
import { filter, share, tap } from 'rxjs';
import {
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramChartContext,
  UnifiedHistogramHitsContext,
  UnifiedHistogramInput$,
  UnifiedHistogramRequestContext,
} from '../types';

export const useRefetch = ({
  dataView,
  request,
  hits,
  chart,
  chartVisible,
  breakdown,
  filters,
  query,
  relativeTimeRange,
  disableAutoFetching,
  input$,
  beforeRefetch,
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
  disableAutoFetching?: boolean;
  input$: UnifiedHistogramInput$;
  beforeRefetch: () => void;
}) => {
  const refetchDeps = useRef<ReturnType<typeof getRefetchDeps>>();

  // When the unified histogram props change, we must compare the current subset
  // that should trigger a histogram refetch against the previous subset. If they
  // are different, we must refetch the histogram to ensure it's up to date.
  useEffect(() => {
    // Skip if auto fetching if disabled
    if (disableAutoFetching) {
      return;
    }

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
        input$.next({ type: 'refetch' });
      }

      refetchDeps.current = newRefetchDeps;
    }
  }, [
    breakdown,
    chart,
    chartVisible,
    dataView,
    disableAutoFetching,
    filters,
    hits,
    input$,
    query,
    relativeTimeRange,
    request,
  ]);

  return useMemo(
    () =>
      input$.pipe(
        filter((message) => message.type === 'refetch'),
        tap(beforeRefetch),
        share()
      ),
    [beforeRefetch, input$]
  );
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
