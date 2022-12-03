/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { merge } from 'rxjs';
import { debounceTime, filter, skip, tap } from 'rxjs/operators';

import type {
  AutoRefreshDoneFn,
  DataPublicPluginStart,
  ISearchSource,
} from '@kbn/data-plugin/public';
import { FetchStatus } from '../../types';
import { DataMain$, DataRefetch$ } from '../hooks/use_saved_search';
import { DiscoverSearchSessionManager } from '../services/discover_search_session';

/**
 * This function returns an observable that's used to trigger data fetching
 */
export function getFetch$({
  setAutoRefreshDone,
  data,
  main$,
  refetch$,
  searchSessionManager,
  initialFetchStatus,
}: {
  setAutoRefreshDone: (val: AutoRefreshDoneFn | undefined) => void;
  data: DataPublicPluginStart;
  main$: DataMain$;
  refetch$: DataRefetch$;
  searchSessionManager: DiscoverSearchSessionManager;
  searchSource: ISearchSource;
  initialFetchStatus: FetchStatus;
}) {
  const { timefilter } = data.query.timefilter;
  const { filterManager } = data.query;
  let fetch$ = merge(
    refetch$.pipe(
      tap(() => {
        console.debug('test step: refetch$', main$.getValue().fetchStatus);
      })
    ),
    filterManager.getFetches$().pipe(
      tap(() => {
        console.debug('test step: filterManager.getFetches$()', main$.getValue().fetchStatus);
      })
    ),
    timefilter.getFetch$().pipe(
      tap(() => {
        console.debug('test step: timefilter.getFetch$()', main$.getValue().fetchStatus);
      })
    ),
    timefilter.getAutoRefreshFetch$().pipe(
      tap((done) => {
        setAutoRefreshDone(done);
      }),
      filter(() => {
        const currentFetchStatus = main$.getValue().fetchStatus;
        return (
          /**
           * filter to prevent auto-refresh triggered fetch when
           * loading is still ongoing
           */
          currentFetchStatus !== FetchStatus.LOADING && currentFetchStatus !== FetchStatus.PARTIAL
        );
      }),
      tap(() => {
        console.debug('test step: timefilter.getAutoRefreshFetch$()', main$.getValue().fetchStatus);
      })
    ),
    data.query.queryString.getUpdates$().pipe(
      tap(() => {
        console.debug(
          'test step: data.query.queryString.getUpdates$()',
          main$.getValue().fetchStatus
        );
      })
    ),
    searchSessionManager.newSearchSessionIdFromURL$.pipe(
      filter((sessionId) => !!sessionId),
      tap(() => {
        console.debug(
          'test step: searchSessionManager.newSearchSessionIdFromURL$',
          main$.getValue().fetchStatus
        );
      })
    )
  ).pipe(debounceTime(100));

  /**
   * Skip initial fetch when discover:searchOnPageLoad is disabled.
   */
  if (initialFetchStatus === FetchStatus.UNINITIALIZED) {
    console.debug('test step: skip initial fetch');
    fetch$ = fetch$.pipe(skip(1));
  }

  return fetch$;
}
