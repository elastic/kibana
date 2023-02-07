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
import { MutableRefObject, useEffect, useRef } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { catchError, filter, lastValueFrom, map, Observable, of } from 'rxjs';
import {
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramInputMessage,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
} from '../../types';
import { useStableCallback } from './use_stable_callback';

export const useTotalHits = ({
  services,
  dataView,
  request,
  hits,
  chartVisible,
  filters,
  query,
  getTimeRange,
  refetch$,
  onTotalHitsChange,
}: {
  services: UnifiedHistogramServices;
  dataView: DataView;
  request: UnifiedHistogramRequestContext | undefined;
  hits: UnifiedHistogramHitsContext | undefined;
  chartVisible: boolean;
  filters: Filter[];
  query: Query | AggregateQuery;
  getTimeRange: () => TimeRange;
  refetch$: Observable<UnifiedHistogramInputMessage>;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
}) => {
  const abortController = useRef<AbortController>();
  const fetch = useStableCallback(() => {
    fetchTotalHits({
      services,
      abortController,
      dataView,
      request,
      hits,
      chartVisible,
      filters,
      query,
      timeRange: getTimeRange(),
      onTotalHitsChange,
    });
  });

  useEffectOnce(fetch);

  useEffect(() => {
    const subscription = refetch$.subscribe(fetch);
    return () => subscription.unsubscribe();
  }, [fetch, refetch$]);
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
