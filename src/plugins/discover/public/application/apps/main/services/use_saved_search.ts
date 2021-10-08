/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { SearchSource } from '../../../../../../data/common';
import { GetStateReturn } from './discover_state';
import { ElasticSearchHit } from '../../../doc_views/doc_views_types';
import { RequestAdapter } from '../../../../../../inspector/public';
import type { AutoRefreshDoneFn } from '../../../../../../data/public';
import { validateTimeRange } from '../utils/validate_time_range';
import { Chart } from '../components/chart/point_series';
import { useSingleton } from '../utils/use_singleton';
import { FetchStatus } from '../../../types';

import { fetchAll } from '../utils/fetch_all';
import { useBehaviorSubject } from '../utils/use_behavior_subject';
import { sendResetMsg } from './use_saved_search_messages';
import { getFetch$ } from '../utils/get_fetch_observable';

export interface SavedSearchData {
  main$: DataMain$;
  documents$: DataDocuments$;
  totalHits$: DataTotalHits$;
  charts$: DataCharts$;
}

export interface TimechartBucketInterval {
  scaled?: boolean;
  description?: string;
  scale?: number;
}

export type DataMain$ = BehaviorSubject<DataMainMsg>;
export type DataDocuments$ = BehaviorSubject<DataDocumentsMsg>;
export type DataTotalHits$ = BehaviorSubject<DataTotalHitsMsg>;
export type DataCharts$ = BehaviorSubject<DataChartsMessage>;

export type DataRefetch$ = Subject<DataRefetchMsg>;

export interface UseSavedSearch {
  refetch$: DataRefetch$;
  data$: SavedSearchData;
  reset: () => void;
  inspectorAdapters: { requests: RequestAdapter };
}

export type DataRefetchMsg = 'reset' | undefined;

export interface DataMsg {
  fetchStatus: FetchStatus;
  error?: Error;
}

export interface DataMainMsg extends DataMsg {
  foundDocuments?: boolean;
}

export interface DataDocumentsMsg extends DataMsg {
  result?: ElasticSearchHit[];
}

export interface DataTotalHitsMsg extends DataMsg {
  fetchStatus: FetchStatus;
  error?: Error;
  result?: number;
}

export interface DataChartsMessage extends DataMsg {
  bucketInterval?: TimechartBucketInterval;
  chartData?: Chart;
}

/**
 * This hook return 2 observables, refetch$ allows to trigger data fetching, data$ to subscribe
 * to the data fetching
 */
export const useSavedSearch = ({
  initialFetchStatus,
  searchSessionManager,
  searchSource,
  services,
  stateContainer,
  useNewFieldsApi,
}: {
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
   * The observables the UI (aka React component) subscribes to get notified about
   * the changes in the data fetching process (high level: fetching started, data was received)
   */
  const main$: DataMain$ = useBehaviorSubject({ fetchStatus: initialFetchStatus });

  const documents$: DataDocuments$ = useBehaviorSubject({ fetchStatus: initialFetchStatus });

  const totalHits$: DataTotalHits$ = useBehaviorSubject({ fetchStatus: initialFetchStatus });

  const charts$: DataCharts$ = useBehaviorSubject({ fetchStatus: initialFetchStatus });

  const dataSubjects = useMemo(() => {
    return {
      main$,
      documents$,
      totalHits$,
      charts$,
    };
  }, [main$, charts$, documents$, totalHits$]);

  /**
   * The observable to trigger data fetching in UI
   * By refetch$.next('reset') rows and fieldcounts are reset to allow e.g. editing of runtime fields
   * to be processed correctly
   */
  const refetch$ = useSingleton(() => new Subject<DataRefetchMsg>());

  /**
   * Values that shouldn't trigger re-rendering when changed
   */
  const refs = useRef<{
    abortController?: AbortController;
    autoRefreshDone?: AutoRefreshDoneFn;
  }>({});

  /**
   * This part takes care of triggering the data fetching by creating and subscribing
   * to an observable of various possible changes in state
   */
  useEffect(() => {
    /**
     * handler emitted by `timefilter.getAutoRefreshFetch$()`
     * to notify when data completed loading and to start a new autorefresh loop
     */
    const setAutoRefreshDone = (fn: AutoRefreshDoneFn | undefined) => {
      refs.current.autoRefreshDone = fn;
    };
    const fetch$ = getFetch$({
      setAutoRefreshDone,
      data,
      main$,
      refetch$,
      searchSessionManager,
      searchSource,
      initialFetchStatus,
    });

    const subscription = fetch$.subscribe((val) => {
      if (!validateTimeRange(timefilter.getTime(), services.toastNotifications)) {
        return;
      }
      inspectorAdapters.requests.reset();

      refs.current.abortController?.abort();
      refs.current.abortController = new AbortController();
      try {
        fetchAll(dataSubjects, searchSource, val === 'reset', {
          abortController: refs.current.abortController,
          appStateContainer: stateContainer.appStateContainer,
          inspectorAdapters,
          data,
          initialFetchStatus,
          searchSessionId: searchSessionManager.getNextSearchSessionId(),
          services,
          useNewFieldsApi,
        }).subscribe({
          complete: () => {
            // if this function was set and is executed, another refresh fetch can be triggered
            refs.current.autoRefreshDone?.();
            refs.current.autoRefreshDone = undefined;
          },
        });
      } catch (error) {
        main$.next({
          fetchStatus: FetchStatus.ERROR,
          error,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [
    data,
    data.query.queryString,
    dataSubjects,
    filterManager,
    initialFetchStatus,
    inspectorAdapters,
    main$,
    refetch$,
    searchSessionManager,
    searchSessionManager.newSearchSessionIdFromURL$,
    searchSource,
    services,
    services.toastNotifications,
    stateContainer.appStateContainer,
    timefilter,
    useNewFieldsApi,
  ]);

  const reset = useCallback(
    () => sendResetMsg(dataSubjects, initialFetchStatus),
    [dataSubjects, initialFetchStatus]
  );

  return {
    refetch$,
    data$: dataSubjects,
    reset,
    inspectorAdapters,
  };
};
