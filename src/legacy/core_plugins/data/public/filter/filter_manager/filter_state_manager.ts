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
import { Subscription } from 'rxjs';
import { State } from 'ui/state_management/state';
import { FilterManager, esFilters, Filter } from '../../../../../../plugins/data/public';

type GetAppStateFunc = () => { filters?: Filter[]; save?: () => void } | undefined | null;

/**
 * FilterStateManager is responsible for watching for filter changes
 * and syncing with FilterManager, as well as syncing FilterManager changes
 * back to the URL.
 **/
export class FilterStateManager {
  private filterManagerUpdatesSubscription: Subscription;

  filterManager: FilterManager;
  globalState: State;
  getAppState: GetAppStateFunc;
  interval: number | undefined;

  constructor(globalState: State, getAppState: GetAppStateFunc, filterManager: FilterManager) {
    this.getAppState = getAppState;
    this.globalState = globalState;
    this.filterManager = filterManager;

    this.watchFilterState();

    this.filterManagerUpdatesSubscription = this.filterManager.getUpdates$().subscribe(() => {
      this.updateAppState();
    });
  }

  destroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.filterManagerUpdatesSubscription.unsubscribe();
  }

  private watchFilterState() {
    // This is a temporary solution to remove rootscope.
    // Moving forward, state should provide observable subscriptions.
    this.interval = window.setInterval(() => {
      const appState = this.getAppState();
      const stateUndefined = !appState || !this.globalState;
      if (stateUndefined) return;

      const globalFilters = this.globalState.filters || [];
      const appFilters = (appState && appState.filters) || [];

      const globalFilterChanged = !esFilters.compareFilters(
        this.filterManager.getGlobalFilters(),
        globalFilters,
        esFilters.COMPARE_ALL_OPTIONS
      );
      const appFilterChanged = !esFilters.compareFilters(
        this.filterManager.getAppFilters(),
        appFilters,
        esFilters.COMPARE_ALL_OPTIONS
      );
      const filterStateChanged = globalFilterChanged || appFilterChanged;

      if (!filterStateChanged) return;

      const newGlobalFilters = _.cloneDeep(globalFilters);
      const newAppFilters = _.cloneDeep(appFilters);
      FilterManager.setFiltersStore(newAppFilters, esFilters.FilterStateStore.APP_STATE);
      FilterManager.setFiltersStore(newGlobalFilters, esFilters.FilterStateStore.GLOBAL_STATE);

      this.filterManager.setFilters(newGlobalFilters.concat(newAppFilters));
    }, 10);
  }

  private saveState() {
    const appState = this.getAppState();
    if (appState && appState.save) appState.save();
    this.globalState.save();
  }

  private updateAppState() {
    // Update Angular state before saving State objects (which save it to URL)
    const partitionedFilters = this.filterManager.getPartitionedFilters();
    const appState = this.getAppState();
    if (appState) {
      appState.filters = partitionedFilters.appFilters;
    }
    this.globalState.filters = partitionedFilters.globalFilters;
    this.saveState();
  }
}
