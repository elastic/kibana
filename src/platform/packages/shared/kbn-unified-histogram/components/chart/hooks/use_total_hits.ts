/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRunningResponse } from '@kbn/data-plugin/public';
import { DataViewType } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import type { MutableRefObject } from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { catchError, filter, lastValueFrom, map, of } from 'rxjs';
import type {
  UnifiedHistogramFetch$,
  UnifiedHistogramFetch$Arguments,
  UnifiedHistogramHitsContext,
  UnifiedHistogramServices,
} from '../../../types';
import { UnifiedHistogramFetchStatus } from '../../../types';
import { useStableCallback } from '../../../hooks/use_stable_callback';

export const useTotalHits = ({
  services,
  hits,
  chartVisible,
  fetch$,
  abortController: parentAbortController,
  onTotalHitsChange,
}: {
  services: UnifiedHistogramServices;
  hits: UnifiedHistogramHitsContext | undefined;
  chartVisible: boolean;
  fetch$: UnifiedHistogramFetch$;
  abortController: AbortController | undefined;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
}) => {
  const abortController = useRef<AbortController>();

  const fetch = useStableCallback(({ fetchParams }: UnifiedHistogramFetch$Arguments) => {
    fetchTotalHits({
      services,
      abortController,
      dataView: fetchParams.dataView,
      searchSessionId: fetchParams.searchSessionId,
      requestAdapter: fetchParams.requestAdapter,
      hits,
      chartVisible,
      filters: fetchParams.filters,
      query: fetchParams.query,
      timeRange: fetchParams.timeRange,
      onTotalHitsChange,
      isPlainRecord: fetchParams.isESQLQuery,
    });
  });

  useEffect(() => {
    const subscription = fetch$.subscribe(fetch);
    return () => subscription.unsubscribe();
  }, [fetch, fetch$]);

  const onAbort = useCallback((e: Event) => {
    abortController.current?.abort((e.target as AbortSignal)?.reason);
  }, []);

  useEffect(() => {
    parentAbortController?.signal.addEventListener('abort', onAbort);
    return () => {
      parentAbortController?.signal.removeEventListener('abort', onAbort);
    };
  }, [parentAbortController, onAbort]);
};

const fetchTotalHits = async ({
  services,
  abortController,
  dataView,
  searchSessionId,
  requestAdapter,
  hits,
  chartVisible,
  filters,
  query,
  timeRange,
  onTotalHitsChange,
  isPlainRecord,
}: Pick<
  UnifiedHistogramFetch$Arguments['fetchParams'],
  'dataView' | 'searchSessionId' | 'requestAdapter' | 'filters' | 'query' | 'timeRange'
> & {
  services: UnifiedHistogramServices;
  abortController: MutableRefObject<AbortController | undefined>;
  hits: UnifiedHistogramHitsContext | undefined;
  chartVisible: boolean;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
  isPlainRecord?: boolean;
}) => {
  if (isPlainRecord) {
    // skip, it will be handled by Discover code
    return;
  }
  abortController.current?.abort();
  abortController.current = undefined;

  if (chartVisible) {
    return;
  }

  onTotalHitsChange?.(UnifiedHistogramFetchStatus.loading, hits?.total);

  const newAbortController = new AbortController();

  abortController.current = newAbortController;

  const response = await fetchTotalHitsSearchSource({
    services,
    abortController: newAbortController,
    dataView,
    searchSessionId,
    requestAdapter,
    filters,
    query,
    timeRange,
  });

  if (!response) {
    return;
  }

  onTotalHitsChange?.(response.resultStatus, response.result);
};

const fetchTotalHitsSearchSource = async ({
  services: { data },
  abortController,
  dataView,
  searchSessionId,
  requestAdapter,
  filters: originalFilters,
  query,
  timeRange,
}: Pick<
  UnifiedHistogramFetch$Arguments['fetchParams'],
  'dataView' | 'searchSessionId' | 'requestAdapter' | 'filters' | 'query' | 'timeRange'
> & {
  services: UnifiedHistogramServices;
  abortController: AbortController;
}) => {
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

  // Let the consumer inspect the request if they want to track it
  const inspector = requestAdapter
    ? {
        adapter: requestAdapter,
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
      sessionId: searchSessionId,
      abortSignal: abortController.signal,
      executionContext: {
        description: 'fetch total hits',
      },
      disableWarningToasts: true, // TODO: show warnings as a badge next to total hits number
    })
    .pipe(
      filter((res) => !isRunningResponse(res)),
      map((res) => res.rawResponse.hits.total as number),
      catchError((error: Error) => of(error))
    );

  const result = await lastValueFrom(fetch$);

  const resultStatus =
    result instanceof Error
      ? UnifiedHistogramFetchStatus.error
      : UnifiedHistogramFetchStatus.complete;

  return { resultStatus, result };
};
