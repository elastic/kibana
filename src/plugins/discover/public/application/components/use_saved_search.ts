/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { merge, Subject, Observable } from 'rxjs';
import { debounceTime, tap, filter } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { DiscoverServices } from '../../build_services';
import { DiscoverSearchSessionManager } from '../angular/discover_search_session';
import { ChartSubject, useChartData } from './histogram/use_chart_data';
import { IndexPattern, ISearchSource } from '../../../../data/common';
import { SavedSearch } from '../../saved_searches';
import { TotalHitsSubject, useTotalHits } from './histogram/use_total_hits';
import { useDocuments } from './use_documents';
import { GetStateReturn } from '../angular/discover_state';
import { ElasticSearchHit } from '../doc_views/doc_views_types';
import { RequestAdapter } from '../../../../inspector/common/adapters/request';
import { fetchStatuses } from './constants';

export interface UseSavedSearch {
  chart$: ChartSubject;
  fetch$: Observable<unknown>;
  fetchCounter: number;
  fetchError?: Error;
  fetchStatus: string;
  hits$: TotalHitsSubject;
  inspectorAdapters?: { requests: RequestAdapter };
  refetch$: Subject<unknown>;
  rows: ElasticSearchHit[];
  reset: () => void;
}
export const useSavedSearch = ({
  services,
  searchSessionManager,
  state,
  indexPattern,
  savedSearch,
  searchSource,
  stateContainer,
  shouldSearchOnPageLoad,
  useNewFieldsApi,
}: {
  services: DiscoverServices;
  searchSessionManager: DiscoverSearchSessionManager;
  state: any;
  indexPattern: IndexPattern;
  savedSearch: SavedSearch;
  searchSource: ISearchSource;
  stateContainer: GetStateReturn;
  shouldSearchOnPageLoad: () => boolean;
  useNewFieldsApi: boolean;
}): UseSavedSearch => {
  const [cachedState, setCachedState] = useState(state);
  const abortControllerRef = useRef<AbortController | undefined>();
  const { data, filterManager, timefilter } = services;
  const refetch$ = useMemo(() => new Subject(), []);
  // handler emitted by `timefilter.getAutoRefreshFetch$()`
  // to notify when data completed loading and to start a new autorefresh loop
  const autoRefreshDoneCb = useRef<undefined | any>(undefined);

  const { fetch$: chart$, fetch: fetchChart } = useChartData({
    data,
    interval: state.interval!,
    savedSearch,
  });

  const { fetch$: hits$, fetch: fetchHits } = useTotalHits({
    data,
    savedSearch,
  });

  const {
    fetchStatus,
    fetchError,
    fetchCounter,
    rows,
    inspectorAdapters,
    fetch,
    reset,
  } = useDocuments({
    services,
    indexPattern,
    useNewFieldsApi,
    showUnmappedFields: useNewFieldsApi,
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

  const fetchAll = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const requests: Array<Promise<any>> = [];
    const searchSessionId = searchSessionManager.getNextSearchSessionId();

    requests.push(fetch(abortControllerRef.current, searchSessionId));

    if (indexPattern.timeFieldName && !state.hideChart) {
      requests.push(fetchChart(abortControllerRef.current, searchSessionId));
    }

    requests.push(fetchHits(abortControllerRef.current, searchSessionId));

    Promise.all(requests).finally(() => {
      autoRefreshDoneCb.current?.();
      autoRefreshDoneCb.current = undefined;
    });
  }, [
    fetch,
    fetchChart,
    fetchHits,
    indexPattern.timeFieldName,
    searchSessionManager,
    state.hideChart,
  ]);

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
    if (state.hideChart !== cachedState.hideChart && !state.hideChart) {
      triggerFetch = true;
    }
    if (state.interval !== cachedState.interval) {
      triggerFetch = true;
    }
    if (!isEqual(state.sort, cachedState.sort)) {
      triggerFetch = true;
    }
    setCachedState(state);
    if (triggerFetch) {
      fetchAll();
    }
  }, [cachedState, refetch$, state.interval, state.sort, fetchAll, state]);

  return {
    fetch$,
    chart$,
    hits$,
    refetch$,
    fetchStatus,
    fetchError,
    fetchCounter,
    rows,
    inspectorAdapters,
    reset: () => {
      reset();
      refetch$.next();
    },
  };
};
