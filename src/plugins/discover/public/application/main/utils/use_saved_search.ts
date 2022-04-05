/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { DiscoverServices } from '../../../build_services';
import { DiscoverSearchSessionManager } from '../services/discover_search_session';
import { ISearchSource } from '../../../../../data/public';
import { GetStateReturn } from '../services/discover_state';
import { RequestAdapter } from '../../../../../inspector/public';
import type { AutoRefreshDoneFn } from '../../../../../data/public';
import { validateTimeRange } from './validate_time_range';
import { Chart } from '../components/chart/point_series';
import { useSingleton } from './use_singleton';
import { FetchStatus } from '../../types';

import { fetchAll } from './fetch_all';
import { useBehaviorSubject } from './use_behavior_subject';
import { sendResetMsg } from './use_saved_search_messages';
import { getFetch$ } from './get_fetch_observable';
import { ElasticSearchHit } from '../../../types';
import { SavedSearch } from '../../../services/saved_searches';

export interface SavedSearchData {
  main$: DataMain$;
  documents$: DataDocuments$;
  totalHits$: DataTotalHits$;
  charts$: DataCharts$;
  availableFields$: AvailableFields$;
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
export type AvailableFields$ = BehaviorSubject<DataAvailableFieldsMsg>;

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

export interface DataAvailableFieldsMsg extends DataMsg {
  fields?: string[];
}

/**
 * This hook return 2 observables, refetch$ allows to trigger data fetching, data$ to subscribe
 * to the data fetching
 */
export const useSavedSearch = ({
  initialFetchStatus,
  savedSearch,
  searchSessionManager,
  searchSource,
  services,
  stateContainer,
  useNewFieldsApi,
}: {
  initialFetchStatus: FetchStatus;
  savedSearch: SavedSearch;
  searchSessionManager: DiscoverSearchSessionManager;
  searchSource: ISearchSource;
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

  const availableFields$: AvailableFields$ = useBehaviorSubject({
    fetchStatus: initialFetchStatus,
  });

  const dataSubjects = useMemo(() => {
    return {
      main$,
      documents$,
      totalHits$,
      charts$,
      availableFields$,
    };
  }, [main$, charts$, documents$, totalHits$, availableFields$]);

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

    const subscription = fetch$.subscribe(async (val) => {
      if (!validateTimeRange(timefilter.getTime(), services.toastNotifications)) {
        return;
      }
      inspectorAdapters.requests.reset();

      refs.current.abortController?.abort();
      refs.current.abortController = new AbortController();
      const autoRefreshDone = refs.current.autoRefreshDone;

      await fetchAll(dataSubjects, searchSource, val === 'reset', {
        abortController: refs.current.abortController,
        appStateContainer: stateContainer.appStateContainer,
        data,
        initialFetchStatus,
        inspectorAdapters,
        savedSearch,
        searchSessionId: searchSessionManager.getNextSearchSessionId(),
        services,
        useNewFieldsApi,
      });

      // If the autoRefreshCallback is still the same as when we started i.e. there was no newer call
      // replacing this current one, call it to make sure we tell that the auto refresh is done
      // and a new one can be scheduled.
      if (autoRefreshDone === refs.current.autoRefreshDone) {
        // if this function was set and is executed, another refresh fetch can be triggered
        refs.current.autoRefreshDone?.();
        refs.current.autoRefreshDone = undefined;
      }
    });

    const abortController = refs.current.abortController;
    return () => {
      abortController?.abort();
      subscription.unsubscribe();
    };
  }, [
    data,
    data.query.queryString,
    dataSubjects,
    filterManager,
    initialFetchStatus,
    inspectorAdapters,
    main$,
    refetch$,
    savedSearch,
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
