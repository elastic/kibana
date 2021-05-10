/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { merge, Subject, BehaviorSubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { debounceTime, tap, filter } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { DiscoverServices } from '../../build_services';
import { DiscoverSearchSessionManager } from '../angular/discover_search_session';
import { IndexPattern, ISearchSource } from '../../../../data/common';
import { SavedSearch } from '../../saved_searches';
import { AppState, GetStateReturn } from '../angular/discover_state';
import { ElasticSearchHit } from '../doc_views/doc_views_types';
import { RequestAdapter } from '../../../../inspector/public';
import { fetchStatuses } from './constants';
import { ChartSubject, useSavedSearchChart } from './use_saved_search_chart';
import { TotalHitsSubject, useSavedSearchTotalHits } from './use_saved_search_total_hits';
import { useSavedSearchDocuments } from './use_saved_search_documents';
import { AutoRefreshDoneFn } from '../../../../data/public';
import { calcFieldCounts } from '../helpers/calc_field_counts';
import { SEARCH_ON_PAGE_LOAD_SETTING } from '../../../common';

export interface UseSavedSearch {
  chart$: ChartSubject;
  hits$: TotalHitsSubject;
  refetch$: Subject<unknown>;
  savedSearch$: SavedSearchSubject;
  shouldSearchOnPageLoad: () => boolean;
}

export type SavedSearchSubject = BehaviorSubject<{
  fetchCounter: number;
  fetchError?: Error;
  fieldCounts: Record<string, number>;
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
        fetchCounter: 0,
        fieldCounts: {},
      }),
    [shouldSearchOnPageLoad]
  );
  const [fetchCounter, setFetchCounter] = useState(0);
  const [cachedState, setCachedState] = useState(state);
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({});
  const abortControllerRef = useRef<AbortController | undefined>();
  const { data, filterManager, timefilter } = services;
  const refetch$ = useMemo(() => new Subject(), []);
  useEffect(() => {
    const subscription = refetch$.subscribe({
      next: (val = '') => {
        if (val === 'reset') {
          // triggered e.g. when runtime field was added our changed
          savedSearch$.next({
            fetchCounter,
            state: fetchStatuses.LOADING,
            rows: [],
            fieldCounts: {},
          });
        }
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCounter, refetch$, savedSearch$]);

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

  const { fetchStatus, fetch } = useSavedSearchDocuments({
    services,
    indexPattern,
    useNewFieldsApi,
    volatileSearchSource: searchSource,
    stateContainer,
    shouldSearchOnPageLoad,
  });

  const fetch$ = useMemo(() => {
    return merge(
      refetch$,
      filterManager.getFetches$(),
      timefilter.getFetch$(),
      timefilter.getAutoRefreshFetch$().pipe(
        tap((done) => {
          autoRefreshDoneCb.current = done;
        }),
        filter(() => fetchStatus !== fetchStatuses.LOADING)
      ),
      data.query.queryString.getUpdates$(),
      searchSessionManager.newSearchSessionIdFromURL$
    ).pipe(debounceTime(100));
  }, [
    refetch$,
    filterManager,
    timefilter,
    data.query.queryString,
    searchSessionManager.newSearchSessionIdFromURL$,
    fetchStatus,
  ]);

  const fetchAll = useCallback(
    (resetFieldCounts = false) => {
      const newFetchCounter = fetchCounter + 1;
      const inspectorAdapters = { requests: new RequestAdapter() };
      const inspector = {
        adapter: inspectorAdapters.requests,
        title: i18n.translate('discover.inspectorRequestDataTitle', {
          defaultMessage: 'data',
        }),
        description: i18n.translate('discover.inspectorRequestDescription', {
          defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
        }),
      };

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      const requests: Array<Promise<unknown>> = [];
      const searchSessionId = searchSessionManager.getNextSearchSessionId();

      requests.push(fetch(abortControllerRef.current, searchSessionId, inspector));

      if (indexPattern.timeFieldName && !state.hideChart) {
        requests.push(fetchChart(abortControllerRef.current, searchSessionId, inspector));
      }

      requests.push(fetchHits(abortControllerRef.current, searchSessionId, inspector));
      savedSearch$.next({ state: fetchStatuses.LOADING, fetchCounter, fieldCounts });

      Promise.all(requests)
        .then((res) => {
          const newFieldCounts = calcFieldCounts(
            resetFieldCounts ? {} : fieldCounts,
            res[0] as ElasticSearchHit[],
            indexPattern
          );

          savedSearch$.next({
            fetchCounter: newFetchCounter,
            state: fetchStatuses.COMPLETE,
            rows: res[0] as ElasticSearchHit[],
            inspectorAdapters,
            fieldCounts: newFieldCounts,
          });
          setFetchCounter(newFetchCounter);
          setFieldCounts(newFieldCounts);
        })
        .finally(() => {
          autoRefreshDoneCb.current?.();
          autoRefreshDoneCb.current = undefined;
        });
    },
    [
      fetch,
      fetchChart,
      fetchCounter,
      fetchHits,
      fieldCounts,
      indexPattern,
      savedSearch$,
      searchSessionManager,
      state.hideChart,
    ]
  );

  useEffect(() => {
    const subscription = fetch$.subscribe({
      next: () => {
        fetchAll();
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAll, fetch$]);

  useEffect(() => {
    let triggerFetch = false;
    let resetFieldCounts = false;
    if (state.hideChart !== cachedState.hideChart && !state.hideChart) {
      triggerFetch = true;
    }
    if (state.interval !== cachedState.interval) {
      triggerFetch = true;
    }
    if (!isEqual(state.sort, cachedState.sort)) {
      triggerFetch = true;
    }
    if (!isEqual(state.index, cachedState.index)) {
      triggerFetch = true;
      resetFieldCounts = true;
    }
    setCachedState(state);
    if (triggerFetch) {
      fetchAll(resetFieldCounts);
    }
  }, [cachedState, refetch$, state.interval, state.sort, fetchAll, state]);

  return {
    chart$,
    hits$,
    refetch$,
    savedSearch$,
    shouldSearchOnPageLoad,
  };
};
