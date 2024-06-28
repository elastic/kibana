/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, Subscription } from 'rxjs';
import { map, tap } from 'rxjs';
import { COMPARE_ALL_OPTIONS, compareFilters, isFilterPinned } from '@kbn/es-query';
import { createStateContainer } from '@kbn/kibana-utils-plugin/public';
import type { TimefilterSetup } from '../timefilter';
import { FilterManager } from '../filter_manager';
import { getQueryState, QueryState } from '../query_state';
import { QueryStateChange } from './types';
import type { QueryStringContract } from '../query_string';

export type QueryState$ = Observable<{ changes: QueryStateChange; state: QueryState }>;

export function createQueryStateObservable({
  timefilter,
  filterManager,
  queryString,
}: {
  timefilter: TimefilterSetup;
  filterManager: FilterManager;
  queryString: QueryStringContract;
}): QueryState$ {
  const state = createStateContainer<QueryState>(
    getQueryState({ timefilter, filterManager, queryString })
  );

  return new Observable((subscriber) => {
    let currentChange: QueryStateChange = {};
    const subs: Subscription[] = [
      queryString.getUpdates$().subscribe(() => {
        currentChange.query = true;
        state.set({ ...state.get(), query: queryString.getQuery() });
      }),
      timefilter.timefilter.getTimeUpdate$().subscribe(() => {
        currentChange.time = true;
        state.set({ ...state.get(), time: timefilter.timefilter.getTime() });
      }),
      timefilter.timefilter.getRefreshIntervalUpdate$().subscribe(() => {
        currentChange.refreshInterval = true;
        state.set({ ...state.get(), refreshInterval: timefilter.timefilter.getRefreshInterval() });
      }),
      filterManager.getUpdates$().subscribe(() => {
        currentChange.filters = true;

        const { filters } = state.get();
        const globalOld = filters?.filter((f) => isFilterPinned(f));
        const appOld = filters?.filter((f) => !isFilterPinned(f));
        const globalNew = filterManager.getGlobalFilters();
        const appNew = filterManager.getAppFilters();

        if (!globalOld || !compareFilters(globalOld, globalNew, COMPARE_ALL_OPTIONS)) {
          currentChange.globalFilters = true;
        }

        if (!appOld || !compareFilters(appOld, appNew, COMPARE_ALL_OPTIONS)) {
          currentChange.appFilters = true;
        }

        state.set({
          ...state.get(),
          filters: filterManager.getFilters(),
        });
      }),
      state.state$
        .pipe(
          map((newState) => ({ state: newState, changes: currentChange })),
          tap(() => {
            currentChange = {};
          })
        )
        .subscribe(subscriber),
    ];
    return () => {
      subs.forEach((s) => s.unsubscribe());
    };
  });
}
