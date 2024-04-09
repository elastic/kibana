/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineLatest, filter, map, merge, Observable, skip } from 'rxjs';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import {
  apiPublishesTimeRange,
  apiPublishesUnifiedSearch,
  PublishesTimeRange,
  PublishesUnifiedSearch,
} from './publishes_unified_search';
import { apiPublishesSearchSession, PublishesSearchSession } from './publishes_search_session';
import { apiHasParentApi, HasParentApi } from '../has_parent_api';
import { apiPublishesReload } from './publishes_reload';

export interface FetchContext {
  isReload: boolean;
  filters: Filter[] | undefined;
  query: Query | AggregateQuery | undefined;
  searchSessionId: string | undefined;
  timeRange: TimeRange | undefined;
  timeslice: [number, number] | undefined;
}

function getFetchContext(api: unknown, isReload: boolean) {
  const typeApi = api as Partial<
    PublishesTimeRange & HasParentApi<Partial<PublishesUnifiedSearch & PublishesSearchSession>>
  >;
  return {
    isReload,
    filters: typeApi?.parentApi?.filters$?.value,
    query: typeApi?.parentApi?.query$?.value,
    searchSessionId: typeApi?.parentApi?.searchSessionId$?.value,
    timeRange: typeApi?.timeRange$?.value ?? typeApi?.parentApi?.timeRange$?.value,
    timeslice: typeApi?.timeRange$?.value ? undefined : typeApi?.parentApi?.timeslice$?.value,
  };
}

export function getFetch$(api: unknown): Observable<FetchContext> {
  function hasSearchSession() {
    return apiHasParentApi(api) && apiPublishesSearchSession(api.parentApi)
      ? typeof api.parentApi.searchSessionId$.value === 'string'
      : false;
  }

  function hasLocalTimeRange() {
    return apiPublishesTimeRange(api)
      ?  typeof api.timeRange$.value === 'object'
      : false;
  }

  const observables: Observable<{ isReload: boolean }>[] = [];

  if (apiPublishesTimeRange(api)) {
    observables.push(
      api.timeRange$.pipe(
        skip(1),
        map(() => ({ isReload: false }))
      )
    );
  }

  if (apiHasParentApi(api) && apiPublishesSearchSession(api.parentApi)) {
    observables.push(
      api.parentApi.searchSessionId$.pipe(
        skip(1),
        map(() => ({ isReload: true }))
      )
    );
  }

  if (apiHasParentApi(api) && apiPublishesUnifiedSearch(api.parentApi)) {
    observables.push(
      combineLatest([api.parentApi.filters$, api.parentApi.query$]).pipe(
        skip(1),
        filter(() => !hasSearchSession()),
        map(() => ({ isReload: false }))
      )
    );

    if (apiHasParentApi(api) && apiPublishesTimeRange(api.parentApi)) {
      const timeObservables: Array<Observable<unknown>> = [api.parentApi.timeRange$];
      if (api.parentApi.timeslice$) {
        timeObservables.push(api.parentApi.timeslice$);
      }
      observables.push(
        combineLatest(timeObservables).pipe(
          skip(1),
          filter(() => !hasSearchSession() && !hasLocalTimeRange()),
          map(() => ({ isReload: false }))
        )
      );
    }
    if (apiHasParentApi(api) && apiPublishesReload(api.parentApi)) {
      observables.push(
        api.parentApi.reload$.pipe(
          filter(() => !hasSearchSession() && !hasLocalTimeRange()),
          map(() => ({ isReload: true }))
        )
      );
    }
  }

  return merge(...observables).pipe(
    map(({ isReload }) => {
      console.log('isReload', isReload);
      return getFetchContext(api, isReload);
    })
  );
}
