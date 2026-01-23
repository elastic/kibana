/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import {
  BehaviorSubject,
  combineLatest,
  combineLatestWith,
  distinctUntilChanged,
  filter,
  map,
  merge,
  of,
  switchMap,
  withLatestFrom,
  type Observable,
} from 'rxjs';

import { useStateFromPublishingSubject } from '../../publishing_subject';
import { apiHasParentApi, type HasParentApi } from '../has_parent_api';
import {
  isReloadTimeFetchContextEqual,
  type FetchContext,
  type ReloadTimeFetchContext,
} from './fetch_context';
import { apiPublishesPauseFetch } from './publishes_pause_fetch';
import { apiPublishesReload } from './publishes_reload';
import { apiPublishesSearchSession, type PublishesSearchSession } from './publishes_search_session';
import {
  apiPublishesTimeRange,
  apiPublishesUnifiedSearch,
  type PublishesTimeRange,
  type PublishesUnifiedSearch,
} from './publishes_unified_search';
import { apiPublishesProjectRouting } from './publishes_project_routing';

function hasLocalTimeRange(api: unknown) {
  return apiPublishesTimeRange(api) ? typeof api.timeRange$.value === 'object' : false;
}

function getFetchContext$(api: unknown): Observable<Omit<FetchContext, 'isReload'>> {
  const observables: {
    [key in keyof Omit<FetchContext, 'isReload'>]: Observable<FetchContext[key]>;
  } = {
    filters: of(undefined),
    query: of(undefined),
    searchSessionId: of(undefined),
    timeRange: of(undefined),
    timeslice: of(undefined),
    projectRouting: of(undefined),
  };

  if (apiHasParentApi(api) && apiPublishesUnifiedSearch(api.parentApi)) {
    observables.filters = api.parentApi.filters$;
    observables.query = api.parentApi.query$;
  }

  if (apiHasParentApi(api) && apiPublishesProjectRouting(api.parentApi)) {
    observables.projectRouting = api.parentApi.projectRouting$;
  }

  observables.timeRange = combineLatest({
    local: apiPublishesTimeRange(api) ? api.timeRange$ : of(undefined),
    parent:
      apiHasParentApi(api) && apiPublishesTimeRange(api.parentApi)
        ? api.parentApi.timeRange$
        : of(undefined),
  }).pipe(
    map(({ local, parent }) => {
      return local ?? parent;
    })
  );

  if (apiHasParentApi(api) && apiPublishesTimeRange(api.parentApi) && api.parentApi.timeslice$) {
    observables.timeslice = api.parentApi.timeslice$.pipe(
      map((timeslice) => {
        return hasLocalTimeRange(api) ? undefined : timeslice;
      })
    );
  }

  return combineLatest(observables);
}

export function fetch$(api: unknown): Observable<FetchContext> {
  const fetchContext$ = getFetchContext$(api);

  const parentPauseFetch =
    apiHasParentApi(api) && apiPublishesPauseFetch(api.parentApi)
      ? api.parentApi.isFetchPaused$
      : of(false);
  const apiPauseFetch = apiPublishesPauseFetch(api) ? api.isFetchPaused$ : of(false);
  const isFetchPaused$ = combineLatest([parentPauseFetch, apiPauseFetch]).pipe(
    map(
      ([parentRequestingPause, apiRequestingPause]) => parentRequestingPause || apiRequestingPause
    )
  );

  const reload$: Observable<ReloadTimeFetchContext> = (
    apiHasParentApi(api) && apiPublishesReload(api.parentApi) ? api.parentApi.reload$ : of()
  ).pipe(
    withLatestFrom(fetchContext$),
    map(([, context]) => ({
      ...context,
      reloadTimestamp: Date.now(),
    }))
  );

  return merge(fetchContext$, reload$).pipe(
    combineLatestWith(isFetchPaused$),
    filter(([, isFetchPaused]) => !isFetchPaused),
    map(([fetchContext]) => fetchContext as ReloadTimeFetchContext),
    distinctUntilChanged((prevContext, nextContext) =>
      isReloadTimeFetchContextEqual(prevContext, nextContext)
    ),
    switchMap(async (reloadTimeFetchContext) => {
      let searchSessionId;
      if (apiHasParentApi(api) && apiPublishesSearchSession(api.parentApi)) {
        searchSessionId =
          (await api.parentApi.requestSearchSessionId?.()) ??
          api.parentApi.searchSessionId$.getValue();
      }
      const { reloadTimestamp, ...rest } = reloadTimeFetchContext;
      return {
        ...rest,
        searchSessionId,
        isReload: Boolean(reloadTimestamp),
      };
    })
  );
}

export const useFetchContext = (api: unknown): FetchContext => {
  const context$ = useMemo(() => {
    const typeApi = api as Partial<
      PublishesTimeRange & HasParentApi<Partial<PublishesUnifiedSearch & PublishesSearchSession>>
    >;
    return new BehaviorSubject<FetchContext>({
      filters: typeApi?.parentApi?.filters$?.value,
      query: typeApi?.parentApi?.query$?.value,
      searchSessionId: typeApi?.parentApi?.searchSessionId$?.value,
      timeRange: typeApi?.timeRange$?.value ?? typeApi?.parentApi?.timeRange$?.value,
      timeslice: typeApi?.timeRange$?.value ? undefined : typeApi?.parentApi?.timeslice$?.value,
      isReload: false,
      projectRouting: undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = fetch$(api).subscribe((nextContext) => context$.next(nextContext));

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useStateFromPublishingSubject(context$);
};
