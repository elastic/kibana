/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable, Subscription } from 'rxjs';
import { filter, map, share } from 'rxjs/operators';
import { CoreStart } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { COMPARE_ALL_OPTIONS, compareFilters, FilterManager } from './filter_manager';
import { TimefilterService, TimefilterSetup } from './timefilter';
import { createSavedQueryService } from './saved_query/saved_query_service';
import { createStateContainer } from '../../../kibana_utils/common/state_containers/create_state_container';
import { QueryAppState, QueryGlobalState } from './state_sync';

function createGlobalQueryObservable({
  timefilter: { timefilter },
  filterManager,
}: {
  timefilter: TimefilterSetup;
  filterManager: FilterManager;
}): Observable<QueryGlobalState> {
  return new Observable(subscriber => {
    const state = createStateContainer<QueryGlobalState>({
      time: timefilter.getTime(),
      refreshInterval: timefilter.getRefreshInterval(),
      filters: filterManager.getGlobalFilters(),
    });

    const subs: Subscription[] = [
      timefilter.getTimeUpdate$().subscribe(() => {
        state.set({ ...state.get(), time: timefilter.getTime() });
      }),
      timefilter.getRefreshIntervalUpdate$().subscribe(() => {
        state.set({ ...state.get(), refreshInterval: timefilter.getRefreshInterval() });
      }),
      filterManager
        .getUpdates$()
        .pipe(
          // we need to track only global filters here
          map(() => filterManager.getGlobalFilters()),
          // continue only if global filters changed
          // and ignore app state filters
          filter(
            newGlobalFilters =>
              !compareFilters(newGlobalFilters, state.get().filters || [], COMPARE_ALL_OPTIONS)
          )
        )
        .subscribe(newGlobalFilters => {
          state.set({ ...state.get(), filters: newGlobalFilters });
        }),
      state.state$.subscribe(subscriber),
    ];
    return () => {
      subs.forEach(s => s.unsubscribe());
    };
  });
}

function createAppQueryObservable({
  timefilter: { timefilter },
  filterManager,
}: {
  timefilter: TimefilterSetup;
  filterManager: FilterManager;
}): Observable<QueryAppState> {
  return new Observable(subscriber => {
    const state = createStateContainer<QueryAppState>({
      filters: filterManager.getAppFilters(),
    });

    const subs: Subscription[] = [
      filterManager
        .getUpdates$()
        .pipe(
          // we need to track only app filters here
          map(() => filterManager.getAppFilters()),
          // continue only if app filters changed
          // and ignore global state filters
          filter(
            newAppFilters =>
              !compareFilters(newAppFilters, state.get().filters || [], COMPARE_ALL_OPTIONS)
          )
        )
        .subscribe(newAppFilters => {
          state.set({ ...state.get(), filters: newAppFilters });
        }),
      state.state$.subscribe(subscriber),
    ];
    return () => {
      subs.forEach(s => s.unsubscribe());
    };
  });
}

/**
 * Query Service
 * @internal
 */

export interface QueryServiceDependencies {
  storage: IStorageWrapper;
  uiSettings: CoreStart['uiSettings'];
}
export class QueryService {
  filterManager!: FilterManager;
  timefilter!: TimefilterSetup;

  app$!: Observable<QueryAppState>;
  global$!: Observable<QueryGlobalState>;

  public setup({ uiSettings, storage }: QueryServiceDependencies) {
    this.filterManager = new FilterManager(uiSettings);

    const timefilterService = new TimefilterService();
    this.timefilter = timefilterService.setup({
      uiSettings,
      storage,
    });

    this.global$ = createGlobalQueryObservable({
      filterManager: this.filterManager,
      timefilter: this.timefilter,
    }).pipe(share());

    this.app$ = createAppQueryObservable({
      filterManager: this.filterManager,
      timefilter: this.timefilter,
    }).pipe(share());

    return {
      filterManager: this.filterManager,
      timefilter: this.timefilter,
      global$: this.global$,
      app$: this.app$,
    };
  }

  public start(savedObjects: CoreStart['savedObjects']) {
    return {
      filterManager: this.filterManager,
      timefilter: this.timefilter,
      global$: this.global$,
      app$: this.app$,
      savedQueries: createSavedQueryService(savedObjects.client),
    };
  }

  public stop() {
    // nothing here yet
  }
}

/** @public */
export type QuerySetup = ReturnType<QueryService['setup']>;
export type QueryStart = ReturnType<QueryService['start']>;
