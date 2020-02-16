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

import _ from 'lodash';
import { filter } from 'rxjs/operators';
import { COMPARE_ALL_OPTIONS, compareFilters } from '../filter_manager/lib/compare_filters';
import { BaseStateContainer } from '../../../../../plugins/kibana_utils/public';
import { QuerySetup, QueryStart } from '../query_service';
import { QueryAppState } from './types';

/**
 * Helper to setup two-way syncing of app scoped data and a state container
 * @param QueryService: either setup or start
 * @param stateContainer to use for syncing
 */
export function connectToQueryAppState<S extends QueryAppState>(
  { filterManager, app$ }: Pick<QueryStart | QuerySetup, 'filterManager' | 'app$'>,
  appState: BaseStateContainer<S>
) {
  function shouldSync() {
    const stateContainerFilters = appState.get().filters;
    if (!stateContainerFilters) return true;
    const filterManagerFilters = filterManager.getAppFilters();
    const areAppFiltersEqual = compareFilters(
      stateContainerFilters,
      filterManagerFilters,
      COMPARE_ALL_OPTIONS
    );

    return !areAppFiltersEqual;
  }

  // initial syncing
  // TODO:
  // filterManager takes precedence, this seems like a good default,
  // and apps could anyway set their own value after initialisation,
  // but maybe maybe this should be a configurable option?
  if (shouldSync()) {
    appState.set({ ...appState.get(), filters: filterManager.getAppFilters() });
  }

  const subs = [
    app$.pipe(filter(shouldSync)).subscribe(appQueryState => {
      appState.set({ ...appState.get(), ...appQueryState });
    }),
    appState.state$.pipe(filter(shouldSync)).subscribe(appFilters => {
      filterManager.setAppFilters(_.cloneDeep(appFilters.filters || []));
    }),
  ];

  return () => {
    subs.forEach(s => s.unsubscribe());
  };
}
