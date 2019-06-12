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

import { Filter, isFilterPinned, FilterStateStore } from '@kbn/es-query';

import _ from 'lodash';
import { Subject, Subscription } from 'rxjs';

import { npSetup } from 'ui/new_platform';

// @ts-ignore
import { compareFilters } from './lib/compare_filters';
// @ts-ignore
import { onlyDisabled } from './lib/only_disabled';
// @ts-ignore
import { onlyStateChanged } from './lib/only_state_changed';
// @ts-ignore
import { mapAndFlattenFilters } from './lib/map_and_flatten_filters';
// @ts-ignore
import { uniqFilters } from './lib/uniq_filters';
// @ts-ignore
import { extractTimeFilter } from './lib/extract_time_filter';
// @ts-ignore
import { changeTimeFilter } from './lib/change_time_filter';

import { PartitionedFilters } from './partitioned_filters';
import { FilterStateManager } from './filter_state_manager';

// const COMPARATOR_OPTIONS = { negate: true, disabled: true };

export class FilterManager {
  filterState: FilterStateManager;
  indexPatterns: any;
  filters: Filter[] = [];
  updated$: Subject<any> = new Subject();
  fetch$: Subject<any> = new Subject();
  updateSubscription$: Subscription | undefined;

  constructor(indexPatterns: any, filterState: FilterStateManager) {
    this.indexPatterns = indexPatterns;
    this.filterState = filterState;

    this.watchFilterState();
  }

  destroy() {
    if (this.updateSubscription$) {
      this.updateSubscription$.unsubscribe();
    }
  }

  private watchFilterState() {
    this.updateSubscription$ = this.filterState
      .getStateUpdated$()
      .subscribe((partitionedFilters: PartitionedFilters) => {
        if (!this.haveFiltersChanged(partitionedFilters)) return;

        // ensure we don't mutate the filters passed in
        const newPartitionedFilters = _.cloneDeep(partitionedFilters);

        FilterManager.setFiltersStore(newPartitionedFilters.appFilters, FilterStateStore.APP_STATE);
        FilterManager.setFiltersStore(
          newPartitionedFilters.globalFilters,
          FilterStateStore.GLOBAL_STATE
        );

        const newFilters = this.mergeIncomingFilters(newPartitionedFilters);
        this.handleStateUpdate(newFilters);
      });
  }

  private mergeIncomingFilters(partitionedFilters: PartitionedFilters): Filter[] {
    const globalFilters = partitionedFilters.globalFilters;
    const appFilters = partitionedFilters.appFilters;

    // existing globalFilters should be mutated by appFilters
    _.each(appFilters, function(filter, i) {
      const match = _.find(globalFilters, function(globalFilter) {
        return compareFilters(globalFilter, filter);
      });

      // no match, do nothing
      if (!match) return;

      // matching filter in globalState, update global and remove from appState
      _.assign(match.meta, filter.meta);
      appFilters.splice(i, 1);
    });

    return uniqFilters(appFilters.reverse().concat(globalFilters.reverse())).reverse();
  }

  private haveFiltersChanged(partitionedFilters: PartitionedFilters) {
    return (
      !_.isEqual(partitionedFilters.appFilters || [], this.getAppFilters()) ||
      !_.isEqual(partitionedFilters.globalFilters || [], this.getGlobalFilters())
    );
  }

  private filtersUpdated(newFilters: Filter[]): boolean {
    return !_.isEqual(this.filters, newFilters);
  }

  private shouldFetch(newFilters: Filter[]) {
    // This is legacy optimization logic.
    // TODO: What it does is - ----------
    return true; // !onlyDisabled(newFilters, this.filters) && !onlyStateChanged(newFilters, this.filters);
  }

  private static partitionFilters(filters: Filter[]): PartitionedFilters {
    const [globalFilters, appFilters] = _.partition(filters, isFilterPinned);
    return {
      globalFilters,
      appFilters,
    };
  }

  private static setFiltersStore(filters: Filter[], store: FilterStateStore) {
    _.map(filters, (filter: Filter) => {
      // Override status only for filters that didn't have state in the first place.
      if (filter.$state === undefined) {
        filter.$state = { store };
      }
    });
  }

  private handleStateUpdate(newFilters: Filter[]) {
    // This is where the angular update magic \ syncing diget happens
    const filtersUpdated = this.filtersUpdated(newFilters);

    // global filters should always be first
    newFilters.sort(
      (a: Filter, b: Filter): number => {
        if (a.$state && a.$state.store === FilterStateStore.GLOBAL_STATE) {
          return -1;
        } else if (b.$state && b.$state.store === FilterStateStore.GLOBAL_STATE) {
          return 1;
        } else {
          return 0;
        }
      }
    );

    this.filters = newFilters;
    if (filtersUpdated) {
      this.filterState.updateAppState(FilterManager.partitionFilters(newFilters));
      this.updated$.next();
      if (this.shouldFetch(newFilters)) {
        this.fetch$.next();
      }
    }
  }

  /* Getters */

  public getFilters() {
    return this.filters;
  }

  public getAppFilters() {
    const { appFilters } = this.getPartitionedFilters();
    return appFilters;
  }

  public getGlobalFilters() {
    const { globalFilters } = this.getPartitionedFilters();
    return globalFilters;
  }

  public getPartitionedFilters(): PartitionedFilters {
    return FilterManager.partitionFilters(this.filters);
  }

  public getUpdates$() {
    return this.updated$.asObservable();
  }

  public getFetches$() {
    return this.fetch$.asObservable();
  }

  /* Setters */

  public async addFilters(filters: Filter[] | Filter, pinFilterStatus?: boolean) {
    if (!Array.isArray(filters)) {
      filters = [filters];
    }

    const { uiSettings } = npSetup.core;
    if (pinFilterStatus === undefined) {
      pinFilterStatus = uiSettings.get('filters:pinnedByDefault');
    }

    // set the store of all filters
    // TODO: is this necessary?
    const store = pinFilterStatus ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE;
    FilterManager.setFiltersStore(filters, store);

    const mappedFilters = await mapAndFlattenFilters(this.indexPatterns, filters);
    const newPartitionedFilters = FilterManager.partitionFilters(mappedFilters);
    const partitionFilters = this.getPartitionedFilters();
    partitionFilters.appFilters.push(...newPartitionedFilters.appFilters);
    partitionFilters.globalFilters.push(...newPartitionedFilters.globalFilters);

    const newFilters = this.mergeIncomingFilters(partitionFilters);
    this.handleStateUpdate(newFilters);
  }

  public async setFilters(newFilters: Filter[]) {
    const mappedFilters = await mapAndFlattenFilters(this.indexPatterns, newFilters);
    this.handleStateUpdate(mappedFilters);
  }

  public removeFilter(filter: Filter) {
    const filterIndex = _.findIndex(this.filters, item => {
      return _.isEqual(item.meta, filter.meta) && _.isEqual(item.query, filter.query);
    });

    if (filterIndex >= 0) {
      const newFilters = _.cloneDeep(this.filters);
      newFilters.splice(filterIndex, 1);
      this.handleStateUpdate(newFilters);
    }
  }

  public invertFilter(filter: Filter) {
    filter.meta.negate = !filter.meta.negate;
  }

  public async removeAll() {
    await this.setFilters([]);
  }

  public async addFiltersAndChangeTimeFilter(filters: Filter[]) {
    const timeFilter = await extractTimeFilter(this.indexPatterns, filters);
    if (timeFilter) changeTimeFilter(timeFilter);
    return this.addFilters(filters.filter(filter => filter !== timeFilter));
  }
}
