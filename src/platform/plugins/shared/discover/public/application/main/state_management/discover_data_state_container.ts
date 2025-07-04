/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import {
  BehaviorSubject,
  filter,
  map,
  mergeMap,
  ReplaySubject,
  share,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import type { AutoRefreshDoneFn } from '@kbn/data-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DEFAULT_COLUMNS_SETTING, SEARCH_ON_PAGE_LOAD_SETTING } from '@kbn/discover-utils';
import { getEsqlDataView } from './utils/get_esql_data_view';
import type { DiscoverAppStateContainer } from './discover_app_state_container';
import type { DiscoverServices } from '../../../build_services';
import type { DiscoverSearchSessionManager } from './discover_search_session';
import { FetchStatus } from '../../types';
import { validateTimeRange } from './utils/validate_time_range';
import { fetchAll, type CommonFetchParams, fetchMoreDocuments } from '../data_fetching/fetch_all';
import { sendResetMsg } from '../hooks/use_saved_search_messages';
import { getFetch$ } from '../data_fetching/get_fetch_observable';
import { getDefaultProfileState } from './utils/get_default_profile_state';
import type { InternalStateStore, RuntimeStateManager, TabActionInjector, TabState } from './redux';
import { internalStateActions, selectTabRuntimeState } from './redux';
import { buildEsqlFetchSubscribe } from './utils/build_esql_fetch_subscribe';
import type { DiscoverSavedSearchContainer } from './discover_saved_search_container';

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
  internalState,
  runtimeStateManager,
  savedSearchContainer,
  setDataView,
  injectCurrentTab,
  getCurrentTab,
}: {
  services: DiscoverServices;
  searchSessionManager: DiscoverSearchSessionManager;
  appStateContainer: DiscoverAppStateContainer;
  internalState: InternalStateStore;
  runtimeStateManager: RuntimeStateManager;
  savedSearchContainer: DiscoverSavedSearchContainer;
  setDataView: (dataView: DataView) => void;
  injectCurrentTab: TabActionInjector;
  getCurrentTab: () => TabState;
}): DiscoverDataStateContainer {
  const { data, uiSettings, toastNotifications } = services;
  const { timefilter } = data.query.timefilter;
  const inspectorAdapters = { requests: new RequestAdapter() };
  const fetchChart$ = new ReplaySubject<void>(1);
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
      savedSearchContainer.getState().id !== undefined ||
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

  /**
   * Subscribes to ES|QL fetches to handle state changes when loading or before a fetch completes
   */
  const { esqlFetchSubscribe, cleanupEsql } = buildEsqlFetchSubscribe({
    internalState,
    appStateContainer,
    dataSubjects,
    injectCurrentTab,
  });

  // The main subscription to handle state changes
  dataSubjects.documents$.pipe(switchMap(esqlFetchSubscribe)).subscribe();
  // Make sure to clean up the ES|QL state when the saved search changes
  savedSearchContainer.getInitial$().subscribe(cleanupEsql);

  /**
   * handler emitted by `timefilter.getAutoRefreshFetch$()`
   * to notify when data completed loading and to start a new autorefresh loop
   */
  let autoRefreshDone: AutoRefreshDoneFn | undefined | null = null;
  const setAutoRefreshDone = (fn: AutoRefreshDoneFn | undefined) => {
    autoRefreshDone = fn;
  };
  const fetch$ = getFetch$({
    setAutoRefreshDone,
    data,
    main$: dataSubjects.main$,
    refetch$,
    searchSource: savedSearchContainer.getState().searchSource,
    searchSessionManager,
  }).pipe(
    filter(() => validateTimeRange(timefilter.getTime(), toastNotifications)),
    tap(() => inspectorAdapters.requests.reset()),
    map((val) => ({
      options: {
        reset: val === 'reset',
        fetchMore: val === 'fetch_more',
      },
    })),
    share()
  );
  let abortController: AbortController;
  let abortControllerFetchMore: AbortController;

  function subscribe() {
    const subscription = fetch$
      .pipe(
        mergeMap(async ({ options }) => {
          const { id: currentTabId, resetDefaultProfileState, dataRequestParams } = getCurrentTab();
          const { scopedProfilesManager$, scopedEbtManager$, currentDataView$ } =
            selectTabRuntimeState(runtimeStateManager, currentTabId);
          const scopedProfilesManager = scopedProfilesManager$.getValue();
          const scopedEbtManager = scopedEbtManager$.getValue();

          const searchSessionId =
            (options.fetchMore && dataRequestParams.searchSessionId) ||
            searchSessionManager.getNextSearchSessionId();

          const commonFetchParams: Omit<CommonFetchParams, 'abortController'> = {
            dataSubjects,
            initialFetchStatus: getInitialFetchStatus(),
            inspectorAdapters,
            searchSessionId,
            services,
            appStateContainer,
            internalState,
            savedSearch: savedSearchContainer.getState(),
            scopedProfilesManager,
            scopedEbtManager,
          };

          abortController?.abort();
          abortControllerFetchMore?.abort();

          if (options.fetchMore) {
            abortControllerFetchMore = new AbortController();
            const fetchMoreTracker = scopedEbtManager.trackPerformanceEvent('discoverFetchMore');

            await fetchMoreDocuments({
              ...commonFetchParams,
              abortController: abortControllerFetchMore,
            });

            fetchMoreTracker.reportEvent();

            return;
          }

          internalState.dispatch(
            injectCurrentTab(internalStateActions.setDataRequestParams)({
              dataRequestParams: {
                timeRangeAbsolute: timefilter.getAbsoluteTime(),
                timeRangeRelative: timefilter.getTime(),
                searchSessionId,
              },
            })
          );

          await scopedProfilesManager.resolveDataSourceProfile({
            dataSource: appStateContainer.getState().dataSource,
            dataView: savedSearchContainer.getState().searchSource.getField('index'),
            query: appStateContainer.getState().query,
          });

          const dataView = currentDataView$.getValue();
          const defaultProfileState = dataView
            ? getDefaultProfileState({ scopedProfilesManager, resetDefaultProfileState, dataView })
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
          const fetchAllTracker = scopedEbtManager.trackPerformanceEvent('discoverFetchAll');

          await fetchAll({
            ...commonFetchParams,
            reset: options.reset,
            abortController,
            getCurrentTab,
            onFetchRecordsComplete: async () => {
              const { resetDefaultProfileState: currentResetDefaultProfileState } = getCurrentTab();

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
              internalState.dispatch(
                injectCurrentTab(internalStateActions.setResetDefaultProfileState)({
                  resetDefaultProfileState: {
                    columns: false,
                    rowHeight: false,
                    breakdownField: false,
                    hideChart: false,
                  },
                })
              );
            },
          });

          fetchAllTracker.reportEvent();

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
      subscription.unsubscribe();
    };
  }

  const fetchQuery = async () => {
    const query = appStateContainer.getState().query;
    const currentDataView = savedSearchContainer.getState().searchSource.getField('index');

    if (isOfAggregateQueryType(query)) {
      const nextDataView = await getEsqlDataView(query, currentDataView, services);
      if (nextDataView !== currentDataView) {
        setDataView(nextDataView);
      }
    }

    refetch$.next(undefined);

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
