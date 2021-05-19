/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useRef, useCallback } from 'react';
import { merge, Subject, BehaviorSubject, forkJoin } from 'rxjs';
import { debounceTime, tap, filter } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { IndexPattern, ISearchSource } from '../../../../../../data/common';
import { SavedSearch } from '../../../../saved_searches';
import { AppState, GetStateReturn } from './discover_state';
import { ElasticSearchHit } from '../../../doc_views/doc_views_types';
import { RequestAdapter } from '../../../../../../inspector/public';
import { fetchStatuses } from '../../../components/constants';
import { ChartSubject, useSavedSearchChart } from './use_saved_search_chart';
import { TotalHitsSubject, useSavedSearchTotalHits } from './use_saved_search_total_hits';
import { useSavedSearchDocuments } from './use_saved_search_documents';
import { AutoRefreshDoneFn } from '../../../../../../data/public';
import { calcFieldCounts } from '../utils/calc_field_counts';
import { SEARCH_ON_PAGE_LOAD_SETTING } from '../../../../../common';
import { validateTimeRange } from '../utils/validate_time_range';

export interface UseSavedSearch {
  chart$: ChartSubject;
  hits$: TotalHitsSubject;
  refetch$: Subject<unknown>;
  savedSearch$: SavedSearchSubject;
  shouldSearchOnPageLoad: () => boolean;
}

export type SavedSearchSubject = BehaviorSubject<{
  fetchCounter?: number;
  fetchError?: Error;
  fieldCounts?: Record<string, number>;
  inspectorAdapters?: { requests: RequestAdapter };
  rows?: ElasticSearchHit[];
  state: string;
}>;

export const useSavedSearch = ({
  indexPattern,
  savedSearch,
  searchSessionManager,
  searchSource,
  services,
  state,
  stateContainer,
  useNewFieldsApi,
}: {
  indexPattern: IndexPattern;
  savedSearch: SavedSearch;
  searchSessionManager: DiscoverSearchSessionManager;
  searchSource: ISearchSource;
  services: DiscoverServices;
  state: AppState;
  stateContainer: GetStateReturn;
  useNewFieldsApi: boolean;
}): UseSavedSearch => {
  const { data, filterManager, timefilter, uiSettings } = services;

  const shouldSearchOnPageLoad = useCallback(() => {
    // A saved search is created on every page load, so we check the ID to see if we're loading a
    // previously saved search or if it is just transient
    return (
      uiSettings.get(SEARCH_ON_PAGE_LOAD_SETTING) ||
      savedSearch.id !== undefined ||
      timefilter.getRefreshInterval().pause === false ||
      searchSessionManager.hasSearchSessionIdInURL()
    );
  }, [uiSettings, savedSearch.id, searchSessionManager, timefilter]);

  const savedSearch$: SavedSearchSubject = useMemo(
    () =>
      new BehaviorSubject({
        state: shouldSearchOnPageLoad() ? fetchStatuses.LOADING : fetchStatuses.UNINITIALIZED,
      }),
    [shouldSearchOnPageLoad]
  );

  const refs = useRef<{
    abortController?: AbortController;
    appState: AppState;
    // handler emitted by `timefilter.getAutoRefreshFetch$()`
    // to notify when data completed loading and to start a new autorefresh loop
    autoRefreshDoneCb?: AutoRefreshDoneFn;
    fetchCounter: number;
    fetchStatus: string;
    fieldCounts: Record<string, number>;
  }>({
    fetchCounter: 0,
    fieldCounts: {},
    appState: state,
    fetchStatus: shouldSearchOnPageLoad() ? fetchStatuses.LOADING : fetchStatuses.UNINITIALIZED,
  });
  const refetch$ = useMemo(() => new Subject(), []);

  const { fetch$: chart$, fetch: fetchChart } = useSavedSearchChart({
    data,
    interval: state.interval!,
    savedSearch,
  });

  const { fetch$: hits$, fetch: fetchHits } = useSavedSearchTotalHits({
    data,
    savedSearch,
  });

  const { fetch: fetchDocs } = useSavedSearchDocuments({
    services,
    indexPattern,
    useNewFieldsApi,
    searchSource,
    stateContainer,
  });

  const fetchAll = useCallback(
    (resetFieldCounts = false) => {
      if (!validateTimeRange(timefilter.getTime(), services.toastNotifications)) {
        return Promise.reject();
      }
      const inspectorAdapters = { requests: new RequestAdapter() };

      if (refs.current.abortController) refs.current.abortController.abort();
      refs.current.abortController = new AbortController();

      refs.current.fetchStatus = fetchStatuses.LOADING;
      savedSearch$.next({
        state: fetchStatuses.LOADING,
        fetchCounter: ++refs.current.fetchCounter,
      });

      const fetchVars = {
        abortController: refs.current.abortController,
        searchSessionId: searchSessionManager.getNextSearchSessionId(),
        inspectorAdapters,
      };

      const fetches$ =
        indexPattern.timeFieldName && !state.hideChart
          ? forkJoin({
              docs: fetchDocs(fetchVars),
              chart: fetchChart(fetchVars),
              totalHits: fetchHits(fetchVars),
            })
          : forkJoin({ docs: fetchDocs(fetchVars), totalHits: fetchHits(fetchVars) });

      fetches$.subscribe(
        (res) => {
          const documents = res.docs.rawResponse.hits.hits;
          if (documents) {
            const newFieldCounts = calcFieldCounts(
              resetFieldCounts ? {} : refs.current.fieldCounts,
              documents,
              indexPattern
            );

            savedSearch$.next({
              state: fetchStatuses.COMPLETE,
              rows: documents,
              inspectorAdapters,
              fieldCounts: newFieldCounts,
            });
            refs.current.fieldCounts = newFieldCounts;
            refs.current.fetchStatus = fetchStatuses.COMPLETE;
          }
        },
        (error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          data.search.showError(error);
          refs.current.fetchStatus = fetchStatuses.ERROR;
          savedSearch$.next({
            state: fetchStatuses.ERROR,
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
      data.search,
      fetchChart,
      fetchDocs,
      fetchHits,
      indexPattern,
      savedSearch$,
      searchSessionManager,
      services.toastNotifications,
      state.hideChart,
      timefilter,
    ]
  );

  useEffect(() => {
    const fetch$ = merge(
      refetch$,
      filterManager.getFetches$(),
      timefilter.getFetch$(),
      timefilter.getAutoRefreshFetch$().pipe(
        tap((done) => {
          refs.current.autoRefreshDoneCb = done;
        }),
        filter(() => refs.current.fetchStatus !== fetchStatuses.LOADING)
      ),
      data.query.queryString.getUpdates$(),
      searchSessionManager.newSearchSessionIdFromURL$
    ).pipe(debounceTime(100));

    const subscription = fetch$.subscribe({
      next: (val) => {
        if (val === 'reset') {
          // triggered e.g. when runtime field was added, changed, deleted
          savedSearch$.next({
            state: fetchStatuses.LOADING,
            rows: [],
            fieldCounts: {},
          });
        }
        fetchAll(val === 'reset');
      },
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
    savedSearch$,
    fetchAll,
  ]);

  /**
   * Track state changes that should trigger a fetch
   */
  useEffect(() => {
    let triggerFetch = false;
    let resetFieldCounts = false;
    if (state.hideChart !== refs.current.appState.hideChart && !state.hideChart) {
      triggerFetch = true;
    } else if (state.interval !== refs.current.appState.interval) {
      triggerFetch = true;
    } else if (!isEqual(state.sort, refs.current.appState.sort)) {
      triggerFetch = true;
    }
    if (!isEqual(state.index, refs.current.appState.index)) {
      triggerFetch = true;
      resetFieldCounts = true;
    }
    refs.current.appState = state;
    if (triggerFetch) {
      refetch$.next(resetFieldCounts);
    }
  }, [refetch$, state.interval, state.sort, state]);

  return {
    chart$,
    hits$,
    refetch$,
    savedSearch$,
    shouldSearchOnPageLoad,
  };
};
