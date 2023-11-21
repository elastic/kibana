/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { BehaviorSubject, filter, map, mergeMap, Observable, share, Subject, tap } from 'rxjs';
import type { AutoRefreshDoneFn } from '@kbn/data-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { AggregateQuery, Query } from '@kbn/es-query';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { DataView } from '@kbn/data-views-plugin/common';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { SEARCH_FIELDS_FROM_SOURCE, SEARCH_ON_PAGE_LOAD_SETTING } from '@kbn/discover-utils';
import { getDataViewByTextBasedQueryLang } from '../utils/get_data_view_by_text_based_query_lang';
import { isTextBasedQuery } from '../utils/is_text_based_query';
import { getRawRecordType } from '../utils/get_raw_record_type';
import { DiscoverAppState } from './discover_app_state_container';
import { DiscoverServices } from '../../../build_services';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { FetchStatus } from '../../types';
import { validateTimeRange } from '../utils/validate_time_range';
import { fetchAll, fetchMoreDocuments } from '../utils/fetch_all';
import { sendResetMsg } from '../hooks/use_saved_search_messages';
import { getFetch$ } from '../utils/get_fetch_observable';
import { InternalState } from './discover_internal_state_container';

export interface SavedSearchData {
  main$: DataMain$;
  documents$: DataDocuments$;
  totalHits$: DataTotalHits$;
  availableFields$: AvailableFields$;
}

export type DataMain$ = BehaviorSubject<DataMainMsg>;
export type DataDocuments$ = BehaviorSubject<DataDocumentsMsg>;
export type DataTotalHits$ = BehaviorSubject<DataTotalHitsMsg>;
export type AvailableFields$ = BehaviorSubject<DataAvailableFieldsMsg>;
export type DataFetch$ = Observable<{
  options: {
    reset: boolean;
    fetchMore: boolean;
  };
  searchSessionId: string;
}>;

export type DataRefetch$ = Subject<DataRefetchMsg>;

export enum RecordRawType {
  /**
   * Documents returned Elasticsearch, nested structure
   */
  DOCUMENT = 'document',
  /**
   * Data returned e.g. ES|QL queries, flat structure
   * */
  PLAIN = 'plain',
}

export type DataRefetchMsg = 'reset' | 'fetch_more' | undefined;

export interface DataMsg {
  fetchStatus: FetchStatus;
  error?: Error;
  recordRawType?: RecordRawType;
  query?: AggregateQuery | Query | undefined;
}

export interface DataMainMsg extends DataMsg {
  foundDocuments?: boolean;
}

export interface DataDocumentsMsg extends DataMsg {
  result?: DataTableRecord[];
  textBasedQueryColumns?: DatatableColumn[]; // columns from text-based request
  textBasedHeaderWarning?: string;
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
   * Observable emitting when a next fetch is triggered
   */
  fetch$: DataFetch$;
  /**
   * Container of data observables (orchestration, data table, total hits, available fields)
   */
  data$: SavedSearchData;
  /**
   * Observable triggering fetching data from ES
   */
  refetch$: DataRefetch$;
  /**
   * Start subscribing to other observables that trigger data fetches
   */
  subscribe: () => () => void;
  /**
   * resetting all data observable to initial state
   */
  reset: (savedSearch: SavedSearch) => void;
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
  getAppState,
  getInternalState,
  getSavedSearch,
  setDataView,
}: {
  services: DiscoverServices;
  searchSessionManager: DiscoverSearchSessionManager;
  getAppState: () => DiscoverAppState;
  getInternalState: () => InternalState;
  getSavedSearch: () => SavedSearch;
  setDataView: (dataView: DataView) => void;
}): DiscoverDataStateContainer {
  const { data, uiSettings, toastNotifications } = services;
  const { timefilter } = data.query.timefilter;
  const inspectorAdapters = { requests: new RequestAdapter() };
  const appState = getAppState();
  const recordRawType = getRawRecordType(appState.query);
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
  const initialState = { fetchStatus: getInitialFetchStatus(), recordRawType };
  const dataSubjects: SavedSearchData = {
    main$: new BehaviorSubject<DataMainMsg>(initialState),
    documents$: new BehaviorSubject<DataDocumentsMsg>(initialState),
    totalHits$: new BehaviorSubject<DataTotalHitsMsg>(initialState),
    availableFields$: new BehaviorSubject<DataAvailableFieldsMsg>(initialState),
  };

  let autoRefreshDone: AutoRefreshDoneFn | undefined;
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
            getAppState,
            getInternalState,
            savedSearch: getSavedSearch(),
            useNewFieldsApi: !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE),
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

          abortController = new AbortController();
          const prevAutoRefreshDone = autoRefreshDone;

          const fetchAllStartTime = window.performance.now();
          await fetchAll(dataSubjects, options.reset, {
            abortController,
            ...commonFetchDeps,
          });
          const fetchAllDuration = window.performance.now() - fetchAllStartTime;
          reportPerformanceMetricEvent(services.analytics, {
            eventName: 'discoverFetchAll',
            duration: fetchAllDuration,
          });

          // If the autoRefreshCallback is still the same as when we started i.e. there was no newer call
          // replacing this current one, call it to make sure we tell that the auto refresh is done
          // and a new one can be scheduled.
          if (autoRefreshDone === prevAutoRefreshDone) {
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
    const query = getAppState().query;
    const currentDataView = getSavedSearch().searchSource.getField('index');

    if (isTextBasedQuery(query)) {
      const nextDataView = await getDataViewByTextBasedQueryLang(query, currentDataView, services);
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

  const reset = (savedSearch: SavedSearch) => {
    const recordType = getRawRecordType(savedSearch.searchSource.getField('query'));
    sendResetMsg(dataSubjects, getInitialFetchStatus(), recordType);
  };

  return {
    fetch: fetchQuery,
    fetchMore,
    fetch$,
    data$: dataSubjects,
    refetch$,
    subscribe,
    reset,
    inspectorAdapters,
    getInitialFetchStatus,
  };
}
