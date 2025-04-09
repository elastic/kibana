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
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DEFAULT_COLUMNS_SETTING, SEARCH_ON_PAGE_LOAD_SETTING } from '@kbn/discover-utils';
import { getIndexPatternFromESQLQuery, hasTransformationalCommand } from '@kbn/esql-utils';
import { isEqual } from 'lodash';
import { getEsqlDataView } from './utils/get_esql_data_view';
import type { DiscoverAppStateContainer } from './discover_app_state_container';
import type { DiscoverServices } from '../../../build_services';
import type { DiscoverSearchSessionManager } from './discover_search_session';
import { FetchStatus } from '../../types';
import { validateTimeRange } from './utils/validate_time_range';
import { fetchAll, fetchMoreDocuments } from '../data_fetching/fetch_all';
import { sendResetMsg } from '../hooks/use_saved_search_messages';
import { getFetch$ } from '../data_fetching/get_fetch_observable';
import { getDefaultProfileState } from './utils/get_default_profile_state';
import type { InternalStateStore, RuntimeStateManager, TabActionInjector, TabState } from './redux';
import { internalStateActions, selectTabRuntimeState } from './redux';
import { getValidViewMode } from '../utils/get_valid_view_mode';

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

const ESQL_MAX_NUM_OF_COLUMNS = 50;

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
  getSavedSearch,
  setDataView,
  injectCurrentTab,
  getCurrentTab,
}: {
  services: DiscoverServices;
  searchSessionManager: DiscoverSearchSessionManager;
  appStateContainer: DiscoverAppStateContainer;
  internalState: InternalStateStore;
  runtimeStateManager: RuntimeStateManager;
  getSavedSearch: () => SavedSearch;
  setDataView: (dataView: DataView) => void;
  injectCurrentTab: TabActionInjector;
  getCurrentTab: () => TabState;
}): DiscoverDataStateContainer {
  const { data, uiSettings, toastNotifications, profilesManager } = services;
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
    })),
    share()
  );
  let abortController: AbortController;
  let abortControllerFetchMore: AbortController;
  let prevEsqlData: {
    initialFetch: boolean;
    query: string;
    allColumns: string[];
    defaultColumns: string[];
  } = {
    initialFetch: true,
    query: '',
    allColumns: [],
    defaultColumns: [],
  };

  const cleanupEsql = () => {
    if (!prevEsqlData.query) {
      return;
    }

    // cleanup when it's not an ES|QL query
    prevEsqlData = {
      initialFetch: true,
      query: '',
      allColumns: [],
      defaultColumns: [],
    };
  };

  function subscribe() {
    const mainSubscription = fetch$
      .pipe(
        mergeMap(async ({ options }) => {
          const { id: currentTabId, resetDefaultProfileState, dataRequestParams } = getCurrentTab();

          const searchSessionId =
            (options.fetchMore && dataRequestParams.searchSessionId) ||
            searchSessionManager.getNextSearchSessionId();

          const commonFetchDeps = {
            initialFetchStatus: getInitialFetchStatus(),
            inspectorAdapters,
            searchSessionId,
            services,
            getAppState: appStateContainer.getState,
            internalState,
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

          internalState.dispatch(
            injectCurrentTab(internalStateActions.setDataRequestParams)({
              dataRequestParams: {
                timeRangeAbsolute: timefilter.getAbsoluteTime(),
                timeRangeRelative: timefilter.getTime(),
                searchSessionId,
              },
            })
          );

          await profilesManager.resolveDataSourceProfile({
            dataSource: appStateContainer.getState().dataSource,
            dataView: getSavedSearch().searchSource.getField('index'),
            query: appStateContainer.getState().query,
          });

          const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, currentTabId);
          const dataView = currentDataView$.getValue();
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
            getCurrentTab,
            async () => {
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
                  },
                })
              );
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

    const esqlSubscription = dataSubjects.documents$
      .pipe(
        switchMap(async (next) => {
          const { query: nextQuery } = next;

          if (!nextQuery) {
            return;
          }

          if (!isOfAggregateQueryType(nextQuery)) {
            // cleanup for a "regular" query
            cleanupEsql();
            return;
          }

          // We need to reset the default profile state on index pattern changes
          // when loading starts to ensure the correct pre fetch state is available
          // before data fetching is triggered
          if (next.fetchStatus === FetchStatus.LOADING) {
            // We have to grab the current query from appState
            // here since nextQuery has not been updated yet
            const appStateQuery = appStateContainer.getState().query;

            if (isOfAggregateQueryType(appStateQuery)) {
              if (prevEsqlData.initialFetch) {
                prevEsqlData.query = appStateQuery.esql;
              }

              const indexPatternChanged =
                getIndexPatternFromESQLQuery(appStateQuery.esql) !==
                getIndexPatternFromESQLQuery(prevEsqlData.query);

              // Reset all default profile state when index pattern changes
              if (indexPatternChanged) {
                internalState.dispatch(
                  injectCurrentTab(internalStateActions.setResetDefaultProfileState)({
                    resetDefaultProfileState: {
                      columns: true,
                      rowHeight: true,
                      breakdownField: true,
                    },
                  })
                );
              }
            }

            return;
          }

          if (next.fetchStatus === FetchStatus.ERROR) {
            // An error occurred, but it's still considered an initial fetch
            prevEsqlData.initialFetch = false;
            return;
          }

          if (next.fetchStatus !== FetchStatus.PARTIAL) {
            return;
          }

          let nextAllColumns = prevEsqlData.allColumns;
          let nextDefaultColumns = prevEsqlData.defaultColumns;

          if (next.result?.length) {
            nextAllColumns = Object.keys(next.result[0].raw);

            if (hasTransformationalCommand(nextQuery.esql)) {
              nextDefaultColumns = nextAllColumns.slice(0, ESQL_MAX_NUM_OF_COLUMNS);
            } else {
              nextDefaultColumns = [];
            }
          }

          if (prevEsqlData.initialFetch) {
            prevEsqlData.initialFetch = false;
            prevEsqlData.query = nextQuery.esql;
            prevEsqlData.allColumns = nextAllColumns;
            prevEsqlData.defaultColumns = nextDefaultColumns;
          }

          const indexPatternChanged =
            getIndexPatternFromESQLQuery(nextQuery.esql) !==
            getIndexPatternFromESQLQuery(prevEsqlData.query);

          const allColumnsChanged = !isEqual(nextAllColumns, prevEsqlData.allColumns);

          const changeDefaultColumns =
            indexPatternChanged || !isEqual(nextDefaultColumns, prevEsqlData.defaultColumns);

          const { viewMode } = appStateContainer.getState();
          const changeViewMode = viewMode !== getValidViewMode({ viewMode, isEsqlMode: true });

          // If the index pattern hasn't changed, but the available columns have changed
          // due to transformational commands, reset the associated default profile state
          if (!indexPatternChanged && allColumnsChanged) {
            internalState.dispatch(
              injectCurrentTab(internalStateActions.setResetDefaultProfileState)({
                resetDefaultProfileState: {
                  columns: true,
                  rowHeight: false,
                  breakdownField: false,
                },
              })
            );
          }

          prevEsqlData.allColumns = nextAllColumns;

          if (indexPatternChanged || changeDefaultColumns || changeViewMode) {
            prevEsqlData.query = nextQuery.esql;
            prevEsqlData.defaultColumns = nextDefaultColumns;

            // just change URL state if necessary
            if (changeDefaultColumns || changeViewMode) {
              const nextState = {
                ...(changeDefaultColumns && { columns: nextDefaultColumns }),
                ...(changeViewMode && { viewMode: undefined }),
              };

              await appStateContainer.replaceUrlState(nextState);
            }
          }

          dataSubjects.documents$.next({
            ...next,
            fetchStatus: FetchStatus.COMPLETE,
          });
        })
      )
      .subscribe();

    return () => {
      mainSubscription.unsubscribe();
      esqlSubscription.unsubscribe();
    };
  }

  const fetchQuery = async () => {
    const query = appStateContainer.getState().query;
    const currentDataView = getSavedSearch().searchSource.getField('index');

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
