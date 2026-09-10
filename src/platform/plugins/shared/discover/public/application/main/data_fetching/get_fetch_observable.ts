/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounceTime, filter, tap, defer, merge } from 'rxjs';

import type { AutoRefreshDoneFn, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FetchStatus } from '../../types';
import type { DataMain$, DataRefetch$ } from '../state_management/discover_data_state_container';
import type { DiscoverSearchSessionManager } from '../state_management/discover_search_session';

/**
 * This function returns an observable that's used to trigger data fetching
 */
export function getFetch$({
  setAutoRefreshDone,
  data,
  main$,
  refetch$,
  searchSessionManager,
}: {
  setAutoRefreshDone: (val: AutoRefreshDoneFn | undefined) => void;
  data: DataPublicPluginStart;
  main$: DataMain$;
  refetch$: DataRefetch$;
  searchSessionManager: DiscoverSearchSessionManager;
}) {
  const { timefilter } = data.query.timefilter;
  return merge(
    refetch$,
    timefilter.getFetch$(),
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
      })
    ),
    defer(() => {
      // We defer creating the search session ID observable until it's subscribed to
      // in order to ensure we get a new instance when switching between tabs.
      // Otherwise, search session IDs from previous tabs could trigger extra fetches
      // when initializing a new tab with a different search session ID.
      return searchSessionManager
        .getNewSearchSessionIdFromURL$()
        .pipe(filter((sessionId) => !!sessionId));
    })
  ).pipe(debounceTime(100));
}
