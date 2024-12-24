/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, filter, map, mergeMap, Observable, share, Subject, tap } from 'rxjs';
import type { AutoRefreshDoneFn } from '@kbn/data-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { AggregateQuery, isOfAggregateQueryType, Query } from '@kbn/es-query';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DEFAULT_COLUMNS_SETTING, SEARCH_ON_PAGE_LOAD_SETTING } from '@kbn/discover-utils';
import { getEsqlDataView } from './utils/get_esql_data_view';
import type { DiscoverAppStateContainer } from './discover_app_state_container';
import type { DiscoverServices } from '../../../build_services';
import type { DiscoverSearchSessionManager } from './discover_search_session';
import { FetchStatus } from '../../types';
import { validateTimeRange } from './utils/validate_time_range';
import { fetchAll, fetchMoreDocuments } from '../data_fetching/fetch_all';
import { sendResetMsg } from '../hooks/use_saved_search_messages';
import { getFetch$ } from '../data_fetching/get_fetch_observable';
import type { DiscoverInternalStateContainer } from './discover_internal_state_container';
import { getDefaultProfileState } from './utils/get_default_profile_state';

export interface SavedSearchData {
  main$: DataMain$;
  documents$: DataDocuments$;
  totalHits$: DataTotalHits$;
}

export type DataMain$ = BehaviorSubject<DataMainMsg>;
export type DataDocuments$ = BehaviorSubject<DataDocumentsMsg>;
export type DataTotalHits$ = BehaviorSubject<DataTotalHitsMsg>;

export type DataRefetch$ = Subject<DataRefetchMsg>;

export type DataRefetchMsg = 'reset' | 'fetch_more' | undefined;

export interface DataMsg {
  fetchStatus: FetchStatus;
  error?: Error;
  query?: AggregateQuery | Query | undefined;
}

export interface DataMainMsg extends DataMsg {
  foundDocuments?: boolean;
}

export interface DataDocumentsMsg extends DataMsg {
  result?: DataTableRecord[];
  esqlQueryColumns?: DatatableColumn[]; // columns from ES|QL request
  esqlHeaderWarning?: string;
  interceptedWarnings?: SearchResponseWarning[]; // warnings (like shard failures)
}

export interface DataTotalHitsMsg extends DataMsg {
  result?: number;
}

export interface DataChartsMessage extends DataMsg {
  response?: SearchResponse;
}

export interface DataAvailableFieldsMsg extends DataMsg {
  fields?: string[];
}

export interface DiscoverDataStateContainer {
  /**
   * Implicitly starting fetching data from ES
   */
  fetch: () => void;
  /**
   * Fetch more data from ES
   */
  fetchMore: () => void;
  /**
   * Container of data observables (orchestration, data table, total hits, available fields)
   */
  data$: SavedSearchData;
  /**
   * Observable triggering fetching data from ES
   */
  refetch$: DataRefetch$;
  /**
   * Emits when the chart should be fetched
   */
  fetchChart$: Observable<void>;
  /**
   * Used to disable the next fetch that would otherwise be triggered by a URL state change
   */
  disableNextFetchOnStateChange$: BehaviorSubject<boolean>;
  /**
   * Start subscribing to other observables that trigger data fetches
   */
  subscribe: () => () => void;
  /**
   * resetting all data observable to initial state
   */
  reset: () => void;

  /**
   * cancels the running queries
   */
  cancel: () => void;

  /**
   * gets active AbortController for running queries
   */
  getAbortController: () => AbortController;

  /**
   * Available Inspector Adaptor allowing to get details about recent requests to ES
   */
  inspectorAdapters: { requests: RequestAdapter; lensRequests?: RequestAdapter };
  /**
   * Return the initial fetch status
   *  UNINITIALIZED: data is not fetched initially, without user triggering it
   *  LOADING: data is fetched initially (when Discover is rendered, or data views are switched)
   */
  getInitialFetchStatus: () => FetchStatus;
}
/**
 * Container responsible for fetching of data in Discover Main
 * Either by triggering requests to Elasticsearch directly, or by
 * orchestrating unified plugins / components like the histogram
 */
export function getDataStateContainer({
  services,
  searchSessionManager,
  appStateContainer,
  internalStateContainer,
  getSavedSearch,
  setDataView,
}: {
  services: DiscoverServices;
  searchSessionManager: DiscoverSearchSessionManager;
  appStateContainer: DiscoverAppStateContainer;
  internalStateContainer: DiscoverInternalStateContainer;
  getSavedSearch: () => SavedSearch;
  setDataView: (dataView: DataView) => void;
}): DiscoverDataStateContainer {
  const { data, uiSettings, toastNotifications, profilesManager } = services;
  const { timefilter } = data.query.timefilter;
  const inspectorAdapters = { requests: new RequestAdapter() };
  const fetchChart$ = new Subject<void>();
  const disableNextFetchOnStateChange$ = new BehaviorSubject(false);

  /**
   * The observable to trigger data fetching in UI
   * By refetch$.next('reset') rows and fieldcounts are reset to allow e.g. editing of runtime fields
   * to be processed correctly
   */
  const refetch$ = new Subject<DataRefetchMsg>();
  const getInitialFetchStatus = () => {
    const shouldSearchOnPageLoad =
      uiSettings.get<boolean>(SEARCH_ON_PAGE_LOAD_SETTING) ||
      getSavedSearch().id !== undefined ||
      !timefilter.getRefreshInterval().pause ||
      searchSessionManager.hasSearchSessionIdInURL();
    return shouldSearchOnPageLoad ? FetchStatus.LOADING : FetchStatus.UNINITIALIZED;
  };

  /**
   * The observables the UI (aka React component) subscribes to get notified about
   * the changes in the data fetching process (high level: fetching started, data was received)
   */
  const initialState = { fetchStatus: getInitialFetchStatus() };
  const dataSubjects: SavedSearchData = {
    main$: new BehaviorSubject<DataMainMsg>(initialState),
    documents$: new BehaviorSubject<DataDocumentsMsg>(initialState),
    totalHits$: new BehaviorSubject<DataTotalHitsMsg>(initialState),
  };
  // This is debugging code, helping you to understand which messages are sent to the data observables
  // Adding a debugger in the functions can be helpful to understand what triggers a message
  // dataSubjects.main$.subscribe((msg) => addLog('dataSubjects.main$', msg));
  // dataSubjects.documents$.subscribe((msg) => addLog('dataSubjects.documents$', msg));
  // dataSubjects.totalHits$.subscribe((msg) => addLog('dataSubjects.totalHits$', msg););
  // Add window.ELASTIC_DISCOVER_LOGGER = 'debug' to see messages in console

  let autoRefreshDone: AutoRefreshDoneFn | undefined | null = null;
  /**
   * handler emitted by `timefilter.getAutoRefreshFetch$()`
   * to notify when data completed loading and to start a new autorefresh loop
   */
  const setAutoRefreshDone = (fn: AutoRefreshDoneFn | undefined) => {
    autoRefreshDone = fn;
  };
  const fetch$ = getFetch$({
    setAutoRefreshDone,
    data,
    main$: dataSubjects.main$,
    refetch$,
    searchSource: getSavedSearch().searchSource,
    searchSessionManager,
  }).pipe(
    filter(() => validateTimeRange(timefilter.getTime(), toastNotifications)),
    tap(() => inspectorAdapters.requests.reset()),
    map((val) => ({
      options: {
        reset: val === 'reset',
        fetchMore: val === 'fetch_more',
      },
      searchSessionId:
        (val === 'fetch_more' && searchSessionManager.getCurrentSearchSessionId()) ||
        searchSessionManager.getNextSearchSessionId(),
    })),
    share()
  );
  let abortController: AbortController;
  let abortControllerFetchMore: AbortController;

  function subscribe() {
    const subscription = fetch$
      .pipe(
        mergeMap(async ({ options, searchSessionId }) => {
          const commonFetchDeps = {
            initialFetchStatus: getInitialFetchStatus(),
            inspectorAdapters,
            searchSessionId,
            services,
            getAppState: appStateContainer.getState,
            getInternalState: internalStateContainer.getState,
            savedSearch: getSavedSearch(),
          };

          abortController?.abort();
          abortControllerFetchMore?.abort();

          if (options.fetchMore) {
            abortControllerFetchMore = new AbortController();
            const fetchMoreStartTime = window.performance.now();

            await fetchMoreDocuments(dataSubjects, {
              abortController: abortControllerFetchMore,
              ...commonFetchDeps,
            });

            const fetchMoreDuration = window.performance.now() - fetchMoreStartTime;
            reportPerformanceMetricEvent(services.analytics, {
              eventName: 'discoverFetchMore',
              duration: fetchMoreDuration,
            });

            return;
          }

          await profilesManager.resolveDataSourceProfile({
            dataSource: appStateContainer.getState().dataSource,
            dataView: getSavedSearch().searchSource.getField('index'),
            query: appStateContainer.getState().query,
          });

          const { resetDefaultProfileState, dataView } = internalStateContainer.getState();
          const defaultProfileState = dataView
            ? getDefaultProfileState({ profilesManager, resetDefaultProfileState, dataView })
            : undefined;
          const preFetchStateUpdate = defaultProfileState?.getPreFetchState();

          if (preFetchStateUpdate) {
            disableNextFetchOnStateChange$.next(true);
            await appStateContainer.replaceUrlState(preFetchStateUpdate);
            disableNextFetchOnStateChange$.next(false);
          }

          // Trigger chart fetching after the pre fetch state has been updated
          // to ensure state values that would affect data fetching are set
          fetchChart$.next();

          abortController = new AbortController();
          const prevAutoRefreshDone = autoRefreshDone;
          const fetchAllStartTime = window.performance.now();

          await fetchAll(
            dataSubjects,
            options.reset,
            {
              abortController,
              ...commonFetchDeps,
            },
            async () => {
              const { resetDefaultProfileState: currentResetDefaultProfileState } =
                internalStateContainer.getState();

              if (currentResetDefaultProfileState.resetId !== resetDefaultProfileState.resetId) {
                return;
              }

              const { esqlQueryColumns } = dataSubjects.documents$.getValue();
              const defaultColumns = uiSettings.get<string[]>(DEFAULT_COLUMNS_SETTING, []);
              const postFetchStateUpdate = defaultProfileState?.getPostFetchState({
                defaultColumns,
                esqlQueryColumns,
              });

              if (postFetchStateUpdate) {
                await appStateContainer.replaceUrlState(postFetchStateUpdate);
              }

              // Clear the default profile state flags after the data fetching
              // is done so refetches don't reset the state again
              internalStateContainer.transitions.setResetDefaultProfileState({
                columns: false,
                rowHeight: false,
                breakdownField: false,
              });
            }
          );

          const fetchAllDuration = window.performance.now() - fetchAllStartTime;
          reportPerformanceMetricEvent(services.analytics, {
            eventName: 'discoverFetchAll',
            duration: fetchAllDuration,
          });

          // If the autoRefreshCallback is still the same as when we started i.e. there was no newer call
          // replacing this current one, call it to make sure we tell that the auto refresh is done
          // and a new one can be scheduled. null is checked to always start initial looping.
          if (autoRefreshDone === prevAutoRefreshDone || prevAutoRefreshDone === null) {
            // if this function was set and is executed, another refresh fetch can be triggered
            autoRefreshDone?.();
            autoRefreshDone = undefined;
          }
        })
      )
      .subscribe();

    return () => {
      abortController?.abort();
      abortControllerFetchMore?.abort();
      subscription.unsubscribe();
    };
  }

  const fetchQuery = async (resetQuery?: boolean) => {
    const query = appStateContainer.getState().query;
    const currentDataView = getSavedSearch().searchSource.getField('index');

    if (isOfAggregateQueryType(query)) {
      const nextDataView = await getEsqlDataView(query, currentDataView, services);
      if (nextDataView !== currentDataView) {
        setDataView(nextDataView);
      }
    }

    if (resetQuery) {
      refetch$.next('reset');
    } else {
      refetch$.next(undefined);
    }

    return refetch$;
  };

  const fetchMore = () => {
    refetch$.next('fetch_more');
    return refetch$;
  };

  const reset = () => {
    sendResetMsg(dataSubjects, getInitialFetchStatus());
  };

  const cancel = () => {
    abortController?.abort();
    abortControllerFetchMore?.abort();
  };

  const getAbortController = () => {
    return abortController;
  };

  return {
    fetch: fetchQuery,
    fetchMore,
    data$: dataSubjects,
    refetch$,
    fetchChart$,
    disableNextFetchOnStateChange$,
    subscribe,
    reset,
    inspectorAdapters,
    getInitialFetchStatus,
    cancel,
    getAbortController,
  };
}
