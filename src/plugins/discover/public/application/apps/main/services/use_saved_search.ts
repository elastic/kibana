/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useRef, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { merge, Subject, BehaviorSubject } from 'rxjs';
import { debounceTime, tap, filter } from 'rxjs/operators';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverSearchSessionManager } from './discover_search_session';
import {
  IndexPattern,
  isCompleteResponse,
  SearchSource,
  tabifyAggResponse,
} from '../../../../../../data/common';
import { GetStateReturn } from './discover_state';
import { ElasticSearchHit } from '../../../doc_views/doc_views_types';
import { RequestAdapter } from '../../../../../../inspector/public';
import { AutoRefreshDoneFn, search } from '../../../../../../data/public';
import { calcFieldCounts } from '../utils/calc_field_counts';
import { validateTimeRange } from '../utils/validate_time_range';
import { updateSearchSource } from '../utils/update_search_source';
import { SortOrder } from '../../../../saved_searches/types';
import { getDimensions, getChartAggConfigs } from '../utils';
import { buildPointSeriesData, Chart } from '../components/chart/point_series';
import { TimechartBucketInterval } from '../components/timechart_header/timechart_header';
import { useSingleton } from '../utils/use_singleton';
import { FetchStatus } from '../../../types';

export type SavedSearchDataSubject = BehaviorSubject<SavedSearchDataMessage>;
export type SavedSearchRefetchSubject = Subject<SavedSearchRefetchMsg>;

export interface UseSavedSearch {
  refetch$: SavedSearchRefetchSubject;
  data$: SavedSearchDataSubject;
  reset: () => void;
}

export type SavedSearchRefetchMsg = 'reset' | undefined;

export interface SavedSearchDataMessage {
  bucketInterval?: TimechartBucketInterval;
  chartData?: Chart;
  fetchCounter?: number;
  fetchError?: Error;
  fieldCounts?: Record<string, number>;
  hits?: number;
  inspectorAdapters?: { requests: RequestAdapter };
  rows?: ElasticSearchHit[];
  state: FetchStatus;
}

/**
 * This hook return 2 observables, refetch$ allows to trigger data fetching, data$ to subscribe
 * to the data fetching
 */
export const useSavedSearch = ({
  indexPattern,
  initialFetchStatus,
  searchSessionManager,
  searchSource,
  services,
  stateContainer,
  useNewFieldsApi,
}: {
  indexPattern: IndexPattern;
  initialFetchStatus: FetchStatus;
  searchSessionManager: DiscoverSearchSessionManager;
  searchSource: SearchSource;
  services: DiscoverServices;
  stateContainer: GetStateReturn;
  useNewFieldsApi: boolean;
}): UseSavedSearch => {
  const { data, filterManager } = services;
  const timefilter = data.query.timefilter.timefilter;

  /**
   * The observable the UI (aka React component) subscribes to get notified about
   * the changes in the data fetching process (high level: fetching started, data was received)
   */
  const data$: SavedSearchDataSubject = useSingleton(
    () =>
      new BehaviorSubject<SavedSearchDataMessage>({
        state: initialFetchStatus,
      })
  );
  /**
   * The observable to trigger data fetching in UI
   * By refetch$.next('reset') rows and fieldcounts are reset to allow e.g. editing of runtime fields
   * to be processed correctly
   */
  const refetch$ = useSingleton(() => new Subject<SavedSearchRefetchMsg>());

  /**
   * Values that shouldn't trigger re-rendering when changed
   */
  const refs = useRef<{
    abortController?: AbortController;
    /**
     * handler emitted by `timefilter.getAutoRefreshFetch$()`
     * to notify when data completed loading and to start a new autorefresh loop
     */
    autoRefreshDoneCb?: AutoRefreshDoneFn;
    /**
     * Number of fetches used for functional testing
     */
    fetchCounter: number;
    /**
     * needed to right auto refresh behavior, a new auto refresh shouldnt be triggered when
     * loading is still ongoing
     */
    fetchStatus: FetchStatus;
    /**
     * needed for merging new with old field counts, high likely legacy, but kept this behavior
     * because not 100% sure in this case
     */
    fieldCounts: Record<string, number>;
  }>({
    fetchCounter: 0,
    fieldCounts: {},
    fetchStatus: initialFetchStatus,
  });

  const sendResetMsg = useCallback(
    (fetchStatus?: FetchStatus) => {
      refs.current.fieldCounts = {};
      refs.current.fetchStatus = fetchStatus ?? initialFetchStatus;
      data$.next({
        state: initialFetchStatus,
        fetchCounter: 0,
        rows: [],
        fieldCounts: {},
        chartData: undefined,
        bucketInterval: undefined,
      });
    },
    [data$, initialFetchStatus]
  );

  const fetchAll = useCallback(
    (reset = false) => {
      if (!validateTimeRange(timefilter.getTime(), services.toastNotifications)) {
        return Promise.reject();
      }
      const inspectorAdapters = { requests: new RequestAdapter() };

      if (refs.current.abortController) refs.current.abortController.abort();
      refs.current.abortController = new AbortController();
      const sessionId = searchSessionManager.getNextSearchSessionId();

      if (reset) {
        sendResetMsg(FetchStatus.LOADING);
      } else {
        // Let the UI know, data fetching started
        data$.next({
          state: FetchStatus.LOADING,
          fetchCounter: ++refs.current.fetchCounter,
        });
        refs.current.fetchStatus = FetchStatus.LOADING;
      }

      const { sort, hideChart, interval } = stateContainer.appStateContainer.getState();
      updateSearchSource(searchSource, false, {
        indexPattern,
        services,
        sort: sort as SortOrder[],
        useNewFieldsApi,
      });
      const chartAggConfigs =
        indexPattern.timeFieldName && !hideChart && interval
          ? getChartAggConfigs(searchSource, interval, data)
          : undefined;

      if (!chartAggConfigs) {
        searchSource.removeField('aggs');
      } else {
        searchSource.setField('aggs', chartAggConfigs.toDsl());
      }

      const searchSourceFetch$ = searchSource.fetch$({
        abortSignal: refs.current.abortController.signal,
        sessionId,
        inspector: {
          adapter: inspectorAdapters.requests,
          title: i18n.translate('discover.inspectorRequestDataTitle', {
            defaultMessage: 'data',
          }),
          description: i18n.translate('discover.inspectorRequestDescriptionDocument', {
            defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
          }),
        },
      });

      searchSourceFetch$.pipe(filter((res) => isCompleteResponse(res))).subscribe(
        (res) => {
          const documents = res.rawResponse.hits.hits;

          const message: SavedSearchDataMessage = {
            state: FetchStatus.COMPLETE,
            rows: documents,
            inspectorAdapters,
            fieldCounts: calcFieldCounts(refs.current.fieldCounts, documents, indexPattern),
            hits: res.rawResponse.hits.total as number,
          };

          if (chartAggConfigs) {
            const bucketAggConfig = chartAggConfigs.aggs[1];
            const tabifiedData = tabifyAggResponse(chartAggConfigs, res.rawResponse);
            const dimensions = getDimensions(chartAggConfigs, data);
            if (dimensions) {
              if (bucketAggConfig && search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)) {
                message.bucketInterval = bucketAggConfig.buckets?.getInterval();
              }
              message.chartData = buildPointSeriesData(tabifiedData, dimensions);
            }
          }
          refs.current.fieldCounts = message.fieldCounts!;
          refs.current.fetchStatus = message.state;
          data$.next(message);
        },
        (error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          data.search.showError(error);
          refs.current.fetchStatus = FetchStatus.ERROR;
          data$.next({
            state: FetchStatus.ERROR,
            inspectorAdapters,
            fetchError: error,
          });
        },
        () => {
          refs.current.autoRefreshDoneCb?.();
          refs.current.autoRefreshDoneCb = undefined;
        }
      );
    },
    [
      timefilter,
      services,
      searchSessionManager,
      stateContainer.appStateContainer,
      searchSource,
      indexPattern,
      useNewFieldsApi,
      data,
      sendResetMsg,
      data$,
    ]
  );

  /**
   * This part takes care of triggering the data fetching by creating and subscribing
   * to an observable of various possible changes in state
   */
  useEffect(() => {
    const fetch$ = merge(
      refetch$,
      filterManager.getFetches$(),
      timefilter.getFetch$(),
      timefilter.getAutoRefreshFetch$().pipe(
        tap((done) => {
          refs.current.autoRefreshDoneCb = done;
        }),
        filter(() => refs.current.fetchStatus !== FetchStatus.LOADING)
      ),
      data.query.queryString.getUpdates$(),
      searchSessionManager.newSearchSessionIdFromURL$.pipe(filter((sessionId) => !!sessionId))
    ).pipe(debounceTime(100));

    const subscription = fetch$.subscribe((val) => {
      fetchAll(val === 'reset');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    data.query.queryString,
    filterManager,
    refetch$,
    searchSessionManager.newSearchSessionIdFromURL$,
    timefilter,
    fetchAll,
  ]);

  return {
    refetch$,
    data$,
    reset: sendResetMsg,
  };
};
