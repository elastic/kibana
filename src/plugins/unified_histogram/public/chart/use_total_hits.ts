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
import { filter, lastValueFrom, map } from 'rxjs';
import type {
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
} from '../types';

export const useTotalHits = ({
  services,
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
  request: UnifiedHistogramRequestContext | undefined;
  chartVisible: boolean;
  hits: UnifiedHistogramHitsContext | undefined;
  dataView: DataView;
  filters: Filter[];
  query: Query | AggregateQuery;
  timeRange: TimeRange;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, totalHits?: number) => void;
}) => {
  const abortController = useRef<AbortController>();
  const totalHitsDeps = useRef<ReturnType<typeof getTotalHitsDeps>>();

  useEffect(() => {
    const newTotalHitsDeps = getTotalHitsDeps({
      chartVisible,
      request,
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
    onTotalHitsChange,
    query,
    request,
    services,
    timeRange,
  ]);
};

const getTotalHitsDeps = ({
  chartVisible,
  request,
  hits,
  dataView,
  filters,
  query,
  timeRange,
}: {
  chartVisible: boolean;
  request: UnifiedHistogramRequestContext | undefined;
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
    request?.lastReloadRequestTime,
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
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, totalHits?: number) => void;
}) => {
  abortController.current?.abort();
  abortController.current = undefined;

  // Either the chart is visible, in which case Lens will make the request,
  // or there is no hits context, which means the total hits should be hidden
  if (chartVisible || !hits) {
    return;
  }

  onTotalHitsChange?.('loading', hits.total);

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
      map((res) => res.rawResponse.hits.total as number)
    );

  const totalHits = await lastValueFrom(fetch$);

  onTotalHitsChange?.('complete', totalHits);
};
