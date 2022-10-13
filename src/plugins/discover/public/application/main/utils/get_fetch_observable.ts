/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { merge } from 'rxjs';
import { debounceTime, filter, tap } from 'rxjs/operators';
import type { AutoRefreshDoneFn, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataMain$, DataRefetch$ } from '../services/discover_data_state_container';
import { addLog } from '../../../utils/addLog';
import { FetchStatus } from '../../types';
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
  initialFetchStatus: FetchStatus;
}) {
  const { timefilter } = data.query.timefilter;
  const { filterManager } = data.query;
  const fetch$ = merge(
    refetch$,
    filterManager.getFetches$(),
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
    data.query.queryString.getUpdates$(),
    searchSessionManager.newSearchSessionIdFromURL$.pipe(filter((sessionId) => !!sessionId))
  )
    .pipe(tap(() => addLog('👁️ fetch$ triggered')))
    .pipe(debounceTime(100));

  return fetch$;
}
