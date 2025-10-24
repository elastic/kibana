/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import {
  apiPublishesComposableFetchContext,
  areFiltersEqualForFetch,
  areVariablesEqualForFetch,
  isTimeSliceEqualForFetch,
  type ComposableFetchContext,
} from '@kbn/presentation-publishing';
import {
  BehaviorSubject,
  Subject,
  combineLatest,
  debounceTime,
  map,
  startWith,
  switchMap,
  type Observable,
  type Subscription,
} from 'rxjs';
import { embeddableService } from '../services/kibana_services';
import { type initializeLayoutManager } from './layout_manager';

type ContextWithID = [string, ComposableFetchContext | undefined];
interface ComposableFetchContextMap {
  [key: string]: ComposableFetchContext;
}

export const initializeComposableFetchContextManager = (
  layoutManager: ReturnType<typeof initializeLayoutManager>
) => {
  let canceled = false;
  let childrenSubscription: Subscription | undefined;
  const childComposableFetchContexts$: Subject<ComposableFetchContextMap> = new Subject();

  // --------------------------------------------------------------------------------------
  // Get initial fetch contexts from all panels
  // --------------------------------------------------------------------------------------
  const initialFetchContextReady = (async () => {
    const initialLayout = layoutManager.internalApi.layout$.value;
    const initialChildState = layoutManager.internalApi.getInitialChildState();

    const unresolvedFetchContexts = Object.entries(initialLayout.panels).reduce(
      (acc: Array<Promise<ContextWithID>>, [uuid, panel]) => {
        if (!embeddableService.hasComposableFetchContextFactory(panel.type)) return acc;
        acc.push(
          (async () => [
            uuid,
            await (
              await embeddableService.getComposableFetchContextFactory(panel.type)
            ).buildFetchContext(initialChildState[uuid]),
          ])()
        );
        return acc;
      },
      [] as Array<Promise<ContextWithID>>
    );

    const initialFetchContexts = (await Promise.allSettled(unresolvedFetchContexts)).reduce(
      (acc, result) => {
        if (result.status === 'rejected') return acc;
        const [uuid, fetchContext] = result.value;
        if (fetchContext) acc[uuid] = fetchContext;
        return acc;
      },
      {} as ComposableFetchContextMap
    );
    if (canceled) return;

    childComposableFetchContexts$.next(initialFetchContexts);

    // --------------------------------------------------------------------------------------
    // Subscribe to child fetch contexts over the lifetime of the Dashboard.
    // --------------------------------------------------------------------------------------
    childrenSubscription = layoutManager.api.children$
      .pipe(
        switchMap((childAPIs) => {
          const fetchContexts = Object.entries(childAPIs).reduce((acc, [uuid, api]) => {
            if (!apiPublishesComposableFetchContext(api)) return acc;
            acc.push(
              api.composableFetchContext$.pipe(
                map((context) => [uuid, context] as ContextWithID),
                startWith([uuid, undefined] as ContextWithID)
              )
            );
            return acc;
          }, [] as Observable<ContextWithID>[]);
          return combineLatest(fetchContexts);
        }),
        map((contextsFromChildren) =>
          contextsFromChildren.reduce((acc, [uuid, childContext]) => {
            if (childContext) acc[uuid] = childContext;
            return acc;
          }, {} as ComposableFetchContextMap)
        )
      )
      .subscribe((runtimeFetchContexts) => {
        if (Object.keys(runtimeFetchContexts).length === 0) return;
        childComposableFetchContexts$.next({ ...initialFetchContexts, ...runtimeFetchContexts });
      });
  })();

  // --------------------------------------------------------------------------------------
  // Compose fetch contexts into publishing subjects
  // --------------------------------------------------------------------------------------
  const composedFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const composedVariables$ = new BehaviorSubject<ESQLControlVariable[] | undefined>(undefined);
  const composedTimeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);

  const compositionSubscription = childComposableFetchContexts$
    .pipe(
      debounceTime(0),

      // compose fetch contexts from all children into one.
      map((fetchContextMap) =>
        Object.values(fetchContextMap).reduce(
          (acc, fetchContext) => {
            acc.filters!.concat(fetchContext.filters ?? []);
            acc.esqlVariables!.concat(fetchContext.esqlVariables ?? []);

            // There should only ever be one time slice. In the event there are more, the last takes precedence.
            if (fetchContext.timeSlice) acc.timeSlice = fetchContext.timeSlice;
            return acc;
          },
          { filters: [], esqlVariables: [] } as ComposableFetchContext
        )
      )
    )
    .subscribe((composedContext) => {
      if (!areFiltersEqualForFetch(composedContext.filters, composedFilters$.value)) {
        composedFilters$.next(composedContext.filters ?? []);
      }
      if (!areVariablesEqualForFetch(composedContext.esqlVariables, composedVariables$.value)) {
        composedVariables$.next(composedContext.esqlVariables);
      }
      if (!isTimeSliceEqualForFetch(composedContext.timeSlice, composedTimeslice$.value)) {
        composedTimeslice$.next(composedContext.timeSlice);
      }
    });

  return {
    internalApi: {
      initialFetchContextReady,
      composedFilters$,
      composedVariables$,
      composedTimeslice$,
    },
    cleanup: () => {
      compositionSubscription.unsubscribe();
      childrenSubscription?.unsubscribe();
      canceled = true;
    },
  };
};
