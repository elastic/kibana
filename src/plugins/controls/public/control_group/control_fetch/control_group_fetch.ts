/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { PublishesUnifiedSearch, PublishingSubject } from '@kbn/presentation-publishing';
import { apiPublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import { BehaviorSubject, debounceTime, map, merge, Observable, switchMap } from 'rxjs';
import { ParentIgnoreSettings } from '../../../common';

export interface ControlGroupFetchContext {
  unifiedSearchFilters?: Filter[] | undefined;
  query?: Query | AggregateQuery | undefined;
  timeRange?: TimeRange | undefined;
}

export function controlGroupFetch$(
  ignoreParentSettings$: PublishingSubject<ParentIgnoreSettings | undefined>,
  parentApi: Partial<PublishesUnifiedSearch> & {
    unifiedSearchFilters$?: PublishingSubject<Filter[] | undefined>;
  }
): Observable<ControlGroupFetchContext> {
  return ignoreParentSettings$.pipe(
    switchMap((parentIgnoreSettings) => {
      const observables: Array<Observable<unknown>> = [];
      // Subscribe to parentApi.unifiedSearchFilters$ instead of parentApi.filters$
      // to avoid passing control group filters back into control group
      if (!parentIgnoreSettings?.ignoreFilters && parentApi.unifiedSearchFilters$) {
        observables.push(parentApi.unifiedSearchFilters$);
      }
      if (!parentIgnoreSettings?.ignoreQuery && parentApi.query$) {
        observables.push(parentApi.query$);
      }
      if (!parentIgnoreSettings?.ignoreTimerange && parentApi.timeRange$) {
        observables.push(parentApi.timeRange$);
      }
      if (apiPublishesReload(parentApi)) {
        observables.push(parentApi.reload$);
      }
      return observables.length ? merge(...observables) : new BehaviorSubject(undefined);
    }),
    debounceTime(0),
    map(() => {
      const parentIgnoreSettings = ignoreParentSettings$.value;
      return {
        unifiedSearchFilters:
          parentIgnoreSettings?.ignoreFilters || !parentApi.unifiedSearchFilters$
            ? undefined
            : parentApi.unifiedSearchFilters$.value,
        query:
          parentIgnoreSettings?.ignoreQuery || !parentApi.query$
            ? undefined
            : parentApi.query$.value,
        timeRange:
          parentIgnoreSettings?.ignoreTimerange || !parentApi.timeRange$
            ? undefined
            : parentApi.timeRange$.value,
      };
    })
  );
}
