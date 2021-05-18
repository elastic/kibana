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
  services,
  searchSessionManager,
  state,
  indexPattern,
  savedSearch,
  searchSource,
  stateContainer,
  useNewFieldsApi,
}: {
  services: DiscoverServices;
  searchSessionManager: DiscoverSearchSessionManager;
  state: AppState;
  indexPattern: IndexPattern;
  savedSearch: SavedSearch;
  searchSource: ISearchSource;
  stateContainer: GetStateReturn;
  useNewFieldsApi: boolean;
}): UseSavedSearch => {
  const shouldSearchOnPageLoad = useCallback(() => {
    // A saved search is created on every page load, so we check the ID to see if we're loading a
    // previously saved search or if it is just transient
    return (
      services.uiSettings.get(SEARCH_ON_PAGE_LOAD_SETTING) ||
      savedSearch.id !== undefined ||
      services.timefilter.getRefreshInterval().pause === false ||
      searchSessionManager.hasSearchSessionIdInURL()
    );
  }, [services.uiSettings, savedSearch.id, searchSessionManager, services.timefilter]);

  const savedSearch$: SavedSearchSubject = useMemo(
    () =>
      new BehaviorSubject({
        state: shouldSearchOnPageLoad() ? fetchStatuses.LOADING : fetchStatuses.UNINITIALIZED,
      }),
    [shouldSearchOnPageLoad]
  );
  const cache = useRef({
    fetchCounter: 0,
    fieldCounts: {},
    appState: state,
    fetchStatus: shouldSearchOnPageLoad() ? fetchStatuses.LOADING : fetchStatuses.UNINITIALIZED,
  });
  const abortControllerRef = useRef<AbortController | undefined>();
  const { data, filterManager, timefilter } = services;
  const refetch$ = useMemo(() => new Subject(), []);

  // handler emitted by `timefilter.getAutoRefreshFetch$()`
  // to notify when data completed loading and to start a new autorefresh loop
  const autoRefreshDoneCb = useRef<undefined | AutoRefreshDoneFn>(undefined);

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
      if (!validateTimeRange(services.timefilter.getTime(), services.toastNotifications)) {
        return Promise.reject();
      }
      const inspectorAdapters = { requests: new RequestAdapter() };
      cache.current.fetchStatus = fetchStatuses.LOADING;

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      const searchSessionId = searchSessionManager.getNextSearchSessionId();

      savedSearch$.next({
        state: fetchStatuses.LOADING,
        fetchCounter: ++cache.current.fetchCounter,
      });

      const fetchVars = {
        abortController: abortControllerRef.current,
        searchSessionId,
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
              resetFieldCounts ? {} : cache.current.fieldCounts,
              documents,
              indexPattern
            );

            savedSearch$.next({
              state: fetchStatuses.COMPLETE,
              rows: documents,
              inspectorAdapters,
              fieldCounts: {},
            });
            cache.current.fieldCounts = newFieldCounts;
          }
        },
        (error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          cache.current.fetchStatus = fetchStatuses.ERROR;
          services.data.search.showError(error);
          savedSearch$.next({
            state: fetchStatuses.ERROR,
            inspectorAdapters,
            fetchError: error,
          });
        },
        () => {
          autoRefreshDoneCb.current?.();
          autoRefreshDoneCb.current = undefined;
        }
      );
    },
    [
      services.timefilter,
      services.toastNotifications,
      services.data.search,
      searchSessionManager,
      savedSearch$,
      indexPattern,
      state.hideChart,
      fetchDocs,
      fetchChart,
      fetchHits,
    ]
  );

  useEffect(() => {
    const fetch$ = merge(
      refetch$,
      filterManager.getFetches$(),
      timefilter.getFetch$(),
      timefilter.getAutoRefreshFetch$().pipe(
        tap((done) => {
          autoRefreshDoneCb.current = done;
        }),
        filter(() => cache.current.fetchStatus !== fetchStatuses.LOADING)
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

  useEffect(() => {
    let triggerFetch = false;
    let resetFieldCounts = false;
    if (state.hideChart !== cache.current.appState.hideChart && !state.hideChart) {
      triggerFetch = true;
    }
    if (state.interval !== cache.current.appState.interval) {
      triggerFetch = true;
    }
    if (!isEqual(state.sort, cache.current.appState.sort)) {
      triggerFetch = true;
    }
    if (!isEqual(state.index, cache.current.appState.index)) {
      triggerFetch = true;
      resetFieldCounts = true;
    }
    cache.current.appState = state;
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
