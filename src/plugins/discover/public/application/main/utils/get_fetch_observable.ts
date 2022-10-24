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
import { addLog } from '../../../utils/add_log';
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
}: {
  setAutoRefreshDone: (val: AutoRefreshDoneFn | undefined) => void;
  data: DataPublicPluginStart;
  main$: DataMain$;
  refetch$: DataRefetch$;
  searchSessionManager: DiscoverSearchSessionManager;
}) {
  const { timefilter } = data.query.timefilter;
  const fetch$ = merge(
    refetch$.pipe(tap(() => addLog('👁️ fetch$ triggered by refetch$'))),
    timefilter.getFetch$().pipe(tap(() => addLog('👁️ fetch$ triggered by timefilter'))),
    timefilter
      .getAutoRefreshFetch$()
      .pipe(tap(() => addLog('👁️ fetch$ triggered by timefilter autorefresh')))
      .pipe(
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
    searchSessionManager.newSearchSessionIdFromURL$.pipe(filter((sessionId) => !!sessionId))
  ).pipe(debounceTime(100));

  return fetch$;
}
