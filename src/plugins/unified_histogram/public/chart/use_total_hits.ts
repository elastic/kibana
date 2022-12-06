/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isCompleteResponse } from '@kbn/data-plugin/public';
import { DataView, DataViewType } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { MutableRefObject, useRef } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { catchError, filter, lastValueFrom, map, of } from 'rxjs';
import {
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramChartContext,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
} from '../types';
import { REQUEST_DEBOUNCE_MS } from './consts';

export const useTotalHits = ({
  services,
  dataView,
  lastReloadRequestTime,
  request,
  hits,
  chart,
  chartVisible,
  breakdown,
  filters,
  query,
  timeRange,
  refetchId,
  onTotalHitsChange,
}: {
  services: UnifiedHistogramServices;
  dataView: DataView;
  lastReloadRequestTime: number | undefined;
  request: UnifiedHistogramRequestContext | undefined;
  hits: UnifiedHistogramHitsContext | undefined;
  chart: UnifiedHistogramChartContext | undefined;
  chartVisible: boolean;
  breakdown: UnifiedHistogramBreakdownContext | undefined;
  filters: Filter[];
  query: Query | AggregateQuery;
  timeRange: TimeRange;
  refetchId: number;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
}) => {
  const abortController = useRef<AbortController>();

  useDebounce(
    () => {
      fetchTotalHits({
        services,
        abortController,
        dataView,
        request,
        hits,
        chartVisible,
        filters,
        query,
        timeRange,
        onTotalHitsChange,
      });
    },
    REQUEST_DEBOUNCE_MS,
    [onTotalHitsChange, refetchId, services]
  );
};

const fetchTotalHits = async ({
  services: { data },
  abortController,
  dataView,
  request,
  hits,
  chartVisible,
  filters: originalFilters,
  query,
  timeRange,
  onTotalHitsChange,
}: {
  services: UnifiedHistogramServices;
  abortController: MutableRefObject<AbortController | undefined>;
  dataView: DataView;
  request: UnifiedHistogramRequestContext | undefined;
  hits: UnifiedHistogramHitsContext | undefined;
  chartVisible: boolean;
  filters: Filter[];
  query: Query | AggregateQuery;
  timeRange: TimeRange;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
}) => {
  abortController.current?.abort();
  abortController.current = undefined;

  // Either the chart is visible, in which case Lens will make the request,
  // or there is no hits context, which means the total hits should be hidden
  if (chartVisible || !hits) {
    return;
  }

  onTotalHitsChange?.(UnifiedHistogramFetchStatus.loading, hits.total);

  const searchSource = data.search.searchSource.createEmpty();

  searchSource
    .setField('index', dataView)
    .setField('query', query)
    .setField('size', 0)
    .setField('trackTotalHits', true);

  let filters = originalFilters;

  if (dataView.type === DataViewType.ROLLUP) {
    // We treat that data view as "normal" even if it was a rollup data view,
    // since the rollup endpoint does not support querying individual documents, but we
    // can get them from the regular _search API that will be used if the data view
    // not a rollup data view.
    searchSource.setOverwriteDataViewType(undefined);
  } else {
    // Set the date range filter fields from timeFilter using the absolute format.
    // Search sessions requires that it be converted from a relative range
    const timeFilter = data.query.timefilter.timefilter.createFilter(dataView, timeRange);

    if (timeFilter) {
      filters = [...filters, timeFilter];
    }
  }

  searchSource.setField('filter', filters);

  abortController.current = new AbortController();

  // Let the consumer inspect the request if they want to track it
  const inspector = request?.adapter
    ? {
        adapter: request.adapter,
        title: i18n.translate('unifiedHistogram.inspectorRequestDataTitleTotalHits', {
          defaultMessage: 'Total hits',
        }),
        description: i18n.translate('unifiedHistogram.inspectorRequestDescriptionTotalHits', {
          defaultMessage: 'This request queries Elasticsearch to fetch the total hits.',
        }),
      }
    : undefined;

  const fetch$ = searchSource
    .fetch$({
      inspector,
      sessionId: request?.searchSessionId,
      abortSignal: abortController.current.signal,
      executionContext: {
        description: 'fetch total hits',
      },
    })
    .pipe(
      filter((res) => isCompleteResponse(res)),
      map((res) => res.rawResponse.hits.total as number),
      catchError((error: Error) => of(error))
    );

  const result = await lastValueFrom(fetch$);

  const resultStatus =
    result instanceof Error
      ? UnifiedHistogramFetchStatus.error
      : UnifiedHistogramFetchStatus.complete;

  onTotalHitsChange?.(resultStatus, result);
};
