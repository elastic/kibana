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
import { cloneDeep, isEqual } from 'lodash';
import { MutableRefObject, useEffect, useRef } from 'react';
import { catchError, filter, lastValueFrom, map, of } from 'rxjs';
import {
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
} from '../types';

export const useTotalHits = ({
  services,
  lastReloadRequestTime,
  request,
  chartVisible,
  hits,
  dataView,
  filters,
  query,
  timeRange,
  onTotalHitsChange,
}: {
  services: UnifiedHistogramServices;
  lastReloadRequestTime: number | undefined;
  request: UnifiedHistogramRequestContext | undefined;
  chartVisible: boolean;
  hits: UnifiedHistogramHitsContext | undefined;
  dataView: DataView;
  filters: Filter[];
  query: Query | AggregateQuery;
  timeRange: TimeRange;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
}) => {
  const abortController = useRef<AbortController>();
  const totalHitsDeps = useRef<ReturnType<typeof getTotalHitsDeps>>();

  // When the unified histogram props change, we must compare the current subset
  // that should trigger a total hits refetch against the previous subset. If they
  // are different, we must refetch the total hits to ensure it's up to date with
  // the chart. These are the props we care about:
  //   - chartVisible:
  //       We only need to fetch the total hits when the chart is hidden,
  //       otherwise Lens will be responsible for updating the display.
  //   - lastReloadRequestTime: A refetch has been manually triggered by the consumer.
  //   - hits:
  //       If the hits context is undefined, we don't need to fetch the
  //       total hits because the display will be hidden.
  //   - dataView: The current data view has changed.
  //   - filters: The current filters have changed.
  //   - query: The current query has been updated.
  //   - timeRange: The selected time range has changed.
  useEffect(() => {
    const newTotalHitsDeps = getTotalHitsDeps({
      chartVisible,
      lastReloadRequestTime,
      hits,
      dataView,
      filters,
      query,
      timeRange,
    });

    if (!isEqual(totalHitsDeps.current, newTotalHitsDeps)) {
      totalHitsDeps.current = newTotalHitsDeps;

      fetchTotalHits({
        services,
        abortController,
        request,
        chartVisible,
        hits,
        dataView,
        filters,
        query,
        timeRange,
        onTotalHitsChange,
      });
    }
  }, [
    chartVisible,
    dataView,
    filters,
    hits,
    lastReloadRequestTime,
    onTotalHitsChange,
    query,
    request,
    services,
    timeRange,
  ]);
};

const getTotalHitsDeps = ({
  chartVisible,
  lastReloadRequestTime,
  hits,
  dataView,
  filters,
  query,
  timeRange,
}: {
  chartVisible: boolean;
  lastReloadRequestTime: number | undefined;
  hits: UnifiedHistogramHitsContext | undefined;
  dataView: DataView;
  filters: Filter[];
  query: Query | AggregateQuery;
  timeRange: TimeRange;
}) =>
  cloneDeep([
    chartVisible,
    Boolean(hits),
    dataView.id,
    filters,
    query,
    timeRange,
    lastReloadRequestTime,
  ]);

const fetchTotalHits = async ({
  services: { data },
  abortController,
  request,
  chartVisible,
  hits,
  dataView,
  filters: originalFilters,
  query,
  timeRange,
  onTotalHitsChange,
}: {
  services: UnifiedHistogramServices;
  abortController: MutableRefObject<AbortController | undefined>;
  request: UnifiedHistogramRequestContext | undefined;
  chartVisible: boolean;
  hits: UnifiedHistogramHitsContext | undefined;
  dataView: DataView;
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
