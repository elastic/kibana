/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useRef, useCallback } from 'react';
import { merge, Subject, Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
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

export interface UseSavedSearch {
  chart$: ChartSubject;
  fetch$: Observable<unknown>;
  fetchCounter: number;
  fetchError?: Error;
  fetchStatus: string;
  hits$: TotalHitsSubject;
  inspectorAdapters: { requests: RequestAdapter };
  refetch$: Subject<unknown>;
  rows: ElasticSearchHit[];
}
export const useFetch = ({
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
  const abortControllerRef = useRef<AbortController | undefined>();
  const { data, filterManager, timefilter } = services;
  const refetch$ = useMemo(() => new Subject(), []);

  const fetch$ = useMemo(() => {
    return merge(
      refetch$,
      filterManager.getFetches$(),
      timefilter.getFetch$(),
      timefilter.getAutoRefreshFetch$(),
      data.query.queryString.getUpdates$(),
      searchSessionManager.newSearchSessionIdFromURL$
    ).pipe(debounceTime(100));
  }, [
    refetch$,
    filterManager,
    timefilter,
    data.query.queryString,
    searchSessionManager.newSearchSessionIdFromURL$,
  ]);
  const { fetch$: chart$, fetch: fetchChart } = useChartData({
    data,
    interval: state.interval!,
    savedSearch,
  });

  const { fetch$: hits$, fetch: fetchHits } = useTotalHits({
    data,
    savedSearch,
  });

  const { fetchStatus, fetchError, fetchCounter, rows, inspectorAdapters, fetch } = useDocuments({
    services,
    indexPattern,
    useNewFieldsApi,
    showUnmappedFields: useNewFieldsApi,
    volatileSearchSource: searchSource,
    stateContainer,
    shouldSearchOnPageLoad,
  });

  const fetchAll = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const searchSessionId = searchSessionManager.getNextSearchSessionId();

    fetch(abortControllerRef.current, searchSessionId);

    if (indexPattern.timeFieldName && !state.hideChart) {
      fetchChart(abortControllerRef.current, searchSessionId);
    }

    fetchHits(abortControllerRef.current, searchSessionId);
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
    const unsubscribe = stateContainer.appStateContainer.subscribe((nextState) => {
      let triggerFetch = false;
      if (state.hideChart !== nextState.hideChart && !nextState.hideChart) {
        triggerFetch = true;
      }
      if (state.interval !== nextState.interval) {
        triggerFetch = true;
      }
      if (!isEqual(state.sort, nextState.sort)) {
        triggerFetch = true;
      }
      if (triggerFetch) {
        fetchAll();
      }
    });

    return () => unsubscribe();
  }, [
    state.hideChart,
    stateContainer.appStateContainer,
    refetch$,
    state.interval,
    state.sort,
    fetchAll,
  ]);

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
  };
};
