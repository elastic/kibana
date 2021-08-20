/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { merge } from 'rxjs';
import { debounceTime, filter, tap } from 'rxjs/operators';

import { FetchStatus } from '../../../types';
import type {
  AutoRefreshDoneFn,
  DataPublicPluginStart,
  SearchSource,
} from '../../../../../../data/public';
import { DataMain$, DataRefetch$ } from '../services/use_saved_search';
import { DiscoverSearchSessionManager } from '../services/discover_search_session';

export function getFetch$({
  autoRefreshDoneCb,
  data,
  main$,
  refetch$,
  searchSessionManager,
  searchSource,
}: {
  autoRefreshDoneCb: AutoRefreshDoneFn | undefined;
  data: DataPublicPluginStart;
  main$: DataMain$;
  refetch$: DataRefetch$;
  searchSessionManager: DiscoverSearchSessionManager;
  searchSource: SearchSource;
}) {
  const { timefilter } = data.query.timefilter;
  const { filterManager } = data.query;
  return merge(
    refetch$,
    filterManager.getFetches$(),
    timefilter.getFetch$(),
    timefilter.getAutoRefreshFetch$().pipe(
      tap((done) => {
        autoRefreshDoneCb = done;
      }),
      filter(() => {
        const currentFetchStatus = main$.getValue().fetchStatus;
        return (
          /**
           * filter to prevent auto-refresh triggered fetch when
           * loading is still ongoing
           */
          currentFetchStatus !== FetchStatus.LOADING &&
          currentFetchStatus !== FetchStatus.PARTIAL &&
          // don't autofetch if it's a index pattern without time field, however this is a temorary solutiom
          // till we've got a better UI
          Boolean(searchSource.getField('index')?.isTimeBased())
        );
      })
    ),
    data.query.queryString.getUpdates$(),
    searchSessionManager.newSearchSessionIdFromURL$.pipe(filter((sessionId) => !!sessionId))
  ).pipe(debounceTime(100));
}
