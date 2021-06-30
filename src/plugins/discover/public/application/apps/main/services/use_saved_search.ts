/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { BehaviorSubject, forkJoin, merge, of, Subject } from 'rxjs';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { IndexPattern, SearchSource } from '../../../../../../data/common';
import { GetStateReturn } from './discover_state';
import { ElasticSearchHit } from '../../../doc_views/doc_views_types';
import { RequestAdapter } from '../../../../../../inspector/public';
import { AutoRefreshDoneFn } from '../../../../../../data/public';
import { validateTimeRange } from '../utils/validate_time_range';
import { Chart } from '../components/chart/point_series';
import { TimechartBucketInterval } from '../components/timechart_header/timechart_header';
import { useSingleton } from '../utils/use_singleton';
import { FetchStatus } from '../../../types';
import { fetchTotalHits } from './fetch_total_hits';
import { fetchChart } from './fetch_chart';
import { fetchDocuments } from './fetch_documents';
import { updateSearchSource } from '../utils/update_search_source';
import { SortOrder } from '../../../../saved_searches/types';

export interface SavedSearchData {
  main$: SavedSearchDataSubject;
  documents$: SavedSearchDataDocumentsSubject;
  totalHits$: SavedSearchTotalHitsSubject;
  charts$: SavedSearchChartsSubject;
}
export type SavedSearchDataSubject = BehaviorSubject<SavedSearchDataMessage>;
export type SavedSearchTotalHitsSubject = BehaviorSubject<SavedSearchDataTotalHitsMessage>;
export type SavedSearchChartsSubject = BehaviorSubject<SavedSearchDataChartsMessage>;

export type SavedSearchDataDocumentsSubject = BehaviorSubject<SavedSearchDataDocumentsMessage>;
export type SavedSearchRefetchSubject = Subject<SavedSearchRefetchMsg>;

export interface UseSavedSearch {
  refetch$: SavedSearchRefetchSubject;
  data$: SavedSearchData;
  reset: () => void;
  inspectorAdapters: { requests: RequestAdapter };
}

export type SavedSearchRefetchMsg = 'reset' | undefined;

export interface SavedSearchDataDocumentsMessage {
  fetchStatus: FetchStatus;
  result?: ElasticSearchHit[];
  error?: Error;
}

export interface SavedSearchDataTotalHitsMessage {
  fetchStatus: FetchStatus;
  result?: number;
  error?: Error;
}

export interface SavedSearchDataChartsMessage {
  fetchStatus: FetchStatus;
  chartData?: Chart;
  error?: Error;
  bucketInterval?: TimechartBucketInterval;
}

export interface SavedSearchDataMessage {
  error?: Error;
  fetchCounter?: number;
  fetchStatus: FetchStatus;
  foundDocuments?: boolean;
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
}) => {
  const { data, filterManager } = services;
  const timefilter = data.query.timefilter.timefilter;

  const inspectorAdapters = useMemo(() => ({ requests: new RequestAdapter() }), []);

  /**
   * The observable the UI (aka React component) subscribes to get notified about
   * the changes in the data fetching process (high level: fetching started, data was received)
   */
  const main$: SavedSearchDataSubject = useSingleton(
    () =>
      new BehaviorSubject<SavedSearchDataMessage>({
        fetchStatus: initialFetchStatus,
      })
  );

  const dataDocuments$: SavedSearchDataDocumentsSubject = useSingleton(
    () =>
      new BehaviorSubject<SavedSearchDataMessage>({
        fetchStatus: initialFetchStatus,
      })
  );

  const dataTotalHits$: SavedSearchTotalHitsSubject = useSingleton(
    () =>
      new BehaviorSubject<SavedSearchDataTotalHitsMessage>({
        fetchStatus: initialFetchStatus,
      })
  );

  const dataCharts$: SavedSearchChartsSubject = useSingleton(
    () =>
      new BehaviorSubject<SavedSearchDataChartsMessage>({
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
  }>({
    fetchCounter: 0,
    fetchStatus: initialFetchStatus,
  });

  /**
   * Resets the fieldCounts cache and sends a reset message
   * It is set to initial state (no documents, fetchCounter to 0)
   * Needed when index pattern is switched or a new runtime field is added
   */
  const sendResetMsg = useCallback(
    (fetchStatus?: FetchStatus, fetchCounter = 0) => {
      refs.current.fetchStatus = fetchStatus ?? initialFetchStatus;
      main$.next({
        fetchStatus: initialFetchStatus,
        fetchCounter,
      });
      dataDocuments$.next({
        fetchStatus: initialFetchStatus,
        result: [],
      });
      dataCharts$.next({
        fetchStatus: initialFetchStatus,
      });
      dataTotalHits$.next({
        fetchStatus: initialFetchStatus,
      });
    },
    [main$, dataCharts$, dataDocuments$, dataTotalHits$, initialFetchStatus]
  );
  /**
   * Function to fetch data from ElasticSearch
   */
  const fetchAll = useCallback(
    (reset = false) => {
      if (!validateTimeRange(timefilter.getTime(), services.toastNotifications)) {
        return Promise.reject();
      }
      inspectorAdapters.requests.reset();

      if (refs.current.abortController) refs.current.abortController.abort();
      refs.current.abortController = new AbortController();
      const sessionId = searchSessionManager.getNextSearchSessionId();
      const fetchCounter = ++refs.current.fetchCounter;

      if (reset) {
        sendResetMsg(FetchStatus.LOADING, fetchCounter);
      } else {
        // Let the UI know, data fetching started
        main$.next({
          fetchStatus: FetchStatus.LOADING,
          fetchCounter,
        });
        [dataDocuments$, dataTotalHits$, dataCharts$].map((subject$) => {
          subject$.next({
            fetchStatus: FetchStatus.LOADING,
          });
        });

        refs.current.fetchStatus = FetchStatus.LOADING;
      }

      const sendPartialStateMsg = () => {
        refs.current.fetchStatus = FetchStatus.PARTIAL;
        main$.next({
          fetchStatus: FetchStatus.PARTIAL,
        });
      };

      const sendCompleteStateMsg = (foundDocuments = true) => {
        refs.current.fetchStatus = FetchStatus.COMPLETE;
        main$.next({
          fetchStatus: FetchStatus.COMPLETE,
          foundDocuments,
        });
        if (!foundDocuments) {
          refs.current.abortController!.abort();
        }
      };

      const { hideChart, interval, sort } = stateContainer.appStateContainer.getState();
      // let's update the base searchSource
      updateSearchSource(searchSource, false, {
        indexPattern,
        services,
        sort: sort as SortOrder[],
        useNewFieldsApi,
      });

      const fetchDeps = {
        abortController: refs.current.abortController!,
        inspectorAdapters,
        onResults: (isEmpty: boolean) => {
          if (isEmpty) {
            refs.current.abortController!.abort();
            sendCompleteStateMsg(false);
          } else {
            sendPartialStateMsg();
          }
        },
        searchSessionId: sessionId,
        searchSource,
      };

      const fetchAndSubscribeDocuments = () => {
        return fetchDocuments(dataDocuments$, fetchDeps);
      };

      const fetchAndSubscribeChart = () => {
        return fetchChart(dataCharts$, {
          ...fetchDeps,
          data,
          interval: interval ?? 'auto',
        });
      };

      const fetchAndSubscribeTotalHits = () => {
        return fetchTotalHits(dataTotalHits$, { ...fetchDeps, data });
      };

      const all = {
        documents: fetchAndSubscribeDocuments(),
        totalHits: fetchAndSubscribeTotalHits(),
        chart: !hideChart && indexPattern.timeFieldName ? fetchAndSubscribeChart() : of(null),
      };

      forkJoin(all).subscribe(
        () => {
          main$.next({ fetchStatus: FetchStatus.COMPLETE, foundDocuments: true });
        },
        (error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          refs.current.fetchStatus = FetchStatus.ERROR;
          data.search.showError(error);
          main$.next({
            fetchStatus: FetchStatus.ERROR,
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
      inspectorAdapters,
      timefilter,
      services,
      searchSessionManager,
      stateContainer,
      searchSource,
      data,
      indexPattern,
      useNewFieldsApi,
      sendResetMsg,
      main$,
      dataDocuments$,
      dataTotalHits$,
      dataCharts$,
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

  const dataSubjects = useMemo(() => {
    return {
      main$,
      documents$: dataDocuments$,
      totalHits$: dataTotalHits$,
      charts$: dataCharts$,
    };
  }, [main$, dataCharts$, dataDocuments$, dataTotalHits$]);

  return {
    refetch$,
    data$: dataSubjects,
    reset: sendResetMsg,
    inspectorAdapters,
  };
};
