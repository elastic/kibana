/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject, forkJoin, merge, of, Subject } from 'rxjs';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { IndexPattern, isCompleteResponse, SearchSource } from '../../../../../../data/common';
import { GetStateReturn } from './discover_state';
import { ElasticSearchHit } from '../../../doc_views/doc_views_types';
import { RequestAdapter } from '../../../../../../inspector/public';
import { AutoRefreshDoneFn } from '../../../../../../data/public';
import { calcFieldCounts } from '../utils/calc_field_counts';
import { validateTimeRange } from '../utils/validate_time_range';
import { updateSearchSource } from '../utils/update_search_source';
import { SortOrder } from '../../../../saved_searches/types';
import { Chart } from '../components/chart/point_series';
import { TimechartBucketInterval } from '../components/timechart_header/timechart_header';
import { useSingleton } from '../utils/use_singleton';
import { FetchStatus } from '../../../types';
import { fetchTotalHits } from './fetch_total_hits';
import { fetchChart } from './fetch_chart';

export type SavedSearchDataSubject = BehaviorSubject<SavedSearchDataMessage>;
export type SavedSearchRefetchSubject = Subject<SavedSearchRefetchMsg>;

export interface UseSavedSearch {
  refetch$: SavedSearchRefetchSubject;
  data$: SavedSearchDataSubject;
  reset: () => void;
}

export type SavedSearchRefetchMsg = 'reset' | undefined;

export interface SavedSearchDataMessage {
  error?: Error;
  fetchCounter?: number;
  fieldCounts?: Record<string, number>;
  inspectorAdapters?: { requests: RequestAdapter };
  fetchStatus: FetchStatus;
  totalHits?: {
    fetchStatus: FetchStatus;
    result?: number;
    error?: Error;
  };
  documents?: {
    fetchStatus: FetchStatus;
    result?: ElasticSearchHit[];
    error?: Error;
  };
  chart?: {
    fetchStatus: FetchStatus;
    chartData?: Chart;
    error?: Error;
    bucketInterval?: TimechartBucketInterval;
  };
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
        fetchStatus: initialFetchStatus,
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

  /**
   * Resets the fieldCounts cache and sends a reset message
   * It is set to initial state (no documents, fetchCounter to 0)
   * Needed when index pattern is switched or a new runtime field is added
   */
  const sendResetMsg = useCallback(
    (fetchStatus?: FetchStatus) => {
      refs.current.fieldCounts = {};
      refs.current.fetchStatus = fetchStatus ?? initialFetchStatus;
      data$.next({
        fetchStatus: initialFetchStatus,
        fetchCounter: 0,
        fieldCounts: {},
      });
    },
    [data$, initialFetchStatus]
  );
  /**
   * Function to fetch data from ElasticSearch
   */
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
          fetchStatus: FetchStatus.LOADING,
          fetchCounter: ++refs.current.fetchCounter,
          documents: {
            fetchStatus: FetchStatus.LOADING,
          },
        });

        data$.next({
          fetchStatus: FetchStatus.LOADING,
          fetchCounter: ++refs.current.fetchCounter,
          totalHits: {
            fetchStatus: FetchStatus.LOADING,
          },
        });

        data$.next({
          fetchStatus: FetchStatus.LOADING,
          fetchCounter: ++refs.current.fetchCounter,
          chart: {
            fetchStatus: FetchStatus.LOADING,
          },
        });

        refs.current.fetchStatus = FetchStatus.LOADING;
      }

      const { sort, hideChart, interval } = stateContainer.appStateContainer.getState();

      const fetchAndSubscribeChart = () => {
        const chartDataFetch$ = fetchChart({
          searchSource: searchSource.getParent()!,
          data,
          abortController: refs.current.abortController!,
          searchSessionId: sessionId,
          inspectorAdapters,
          interval: interval ?? 'auto',
        });

        chartDataFetch$.subscribe((res) => {
          if (res) {
            data$.next({
              fetchStatus: FetchStatus.PARTIAL,
              chart: {
                fetchStatus: FetchStatus.COMPLETE,
                chartData: res.chartData,
                bucketInterval: res.bucketInterval,
              },
            });
          }
        });
        return chartDataFetch$;
      };

      const totalHitsFetch$ = fetchTotalHits({
        searchSource: searchSource.getParent()!,
        data,
        abortController: refs.current.abortController,
        searchSessionId: sessionId,
        inspectorAdapters,
      });
      totalHitsFetch$.pipe(filter((res) => isCompleteResponse(res))).subscribe((res) => {
        const totalHitsNr = res.rawResponse.hits.total as number;
        data$.next({
          fetchStatus: totalHitsNr > 0 ? FetchStatus.PARTIAL : FetchStatus.COMPLETE,
          totalHits: {
            fetchStatus: FetchStatus.COMPLETE,
            result: totalHitsNr,
          },
        });
      });

      updateSearchSource(searchSource, false, {
        indexPattern,
        services,
        sort: sort as SortOrder[],
        useNewFieldsApi,
      });

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

      searchSourceFetch$.subscribe((res) => {
        const documents = res.rawResponse.hits.hits;

        const message: SavedSearchDataMessage = {
          fetchStatus: FetchStatus.PARTIAL,
          documents: {
            fetchStatus: FetchStatus.COMPLETE,
            result: documents,
          },
          inspectorAdapters,
          fieldCounts: calcFieldCounts(refs.current.fieldCounts, documents, indexPattern),
        };

        refs.current.fieldCounts = message.fieldCounts!;
        refs.current.fetchStatus = message.fetchStatus;
        data$.next(message);
      });

      forkJoin({
        totalHits: totalHitsFetch$,
        documents: searchSourceFetch$,
        chart: !hideChart && indexPattern.timeFieldName ? fetchAndSubscribeChart() : of(null),
      }).subscribe(
        () => {
          data$.next({ fetchStatus: FetchStatus.COMPLETE });
        },
        (error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          data.search.showError(error);
          refs.current.fetchStatus = FetchStatus.ERROR;
          data$.next({
            fetchStatus: FetchStatus.ERROR,
            inspectorAdapters,
            error,
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
