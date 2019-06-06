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

import { Filter, toggleFilterNegated, FilterStateStore } from '@kbn/es-query';

import _ from 'lodash';
import { Subject } from 'rxjs';

import { getNewPlatform } from 'ui/new_platform';

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

export class FilterManager {
  filterState: FilterStateManager;
  indexPatterns: any;
  filters: Filter[] = [];
  updated$: Subject<any> = new Subject();

  constructor(indexPatterns: any, filterState: FilterStateManager) {
    this.indexPatterns = indexPatterns;
    this.filterState = filterState;

    this.watchFilterState();
  }

  private watchFilterState() {
    this.filterState.getStateUpdated$().subscribe((partitionedFilters: PartitionedFilters) => {
      if (!this.haveFiltersChanged(partitionedFilters)) return;

      const newFilters = this.mergeFilters(
        partitionedFilters.appFilters,
        partitionedFilters.globalFilters
      );

      this.setFilters(newFilters);
    });
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
    return !onlyDisabled(newFilters, this.filters) && !onlyStateChanged(newFilters, this.filters);
  }

  private mergeFilters(newFilters: Filter[], oldFilters: Filter[]): Filter[] {
    // Order matters!
    // uniqFilters will throw out duplicates from the back of the array,
    // but we want newer filters to overwrite previously created filters.
    return uniqFilters(newFilters.concat(oldFilters));
  }

  private emitUpdateIfChanged(newFilters: Filter[]) {
    // This is an optimization
    const shouldFetch = this.shouldFetch(newFilters);
    if (this.filtersUpdated(newFilters)) {
      this.updated$.next({
        shouldFetch,
      });
    }
  }

  private static partitionFilters(filters: Filter[]): PartitionedFilters {
    const [globalFilters, appFilters] = _.partition(filters, filter => {
      return filter.$state.store === FilterStateStore.GLOBAL_STATE;
    });

    return {
      globalFilters,
      appFilters,
    };
  }

  private handleStateUpdate(newFilters: Filter[]) {
    // This is where the angular update magic \ syncing diget happens
    const filtersUpdated = this.filtersUpdated(newFilters);
    this.filters = newFilters;
    if (filtersUpdated) {
      this.filterState.updateAppState(FilterManager.partitionFilters(newFilters));
      this.updated$.next({
        shouldFetch: this.shouldFetch(newFilters),
      });
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

  /* Setters */

  public async addFilters(filters: Filter[], pinFilterStatus?: boolean) {
    const { uiSettings } = getNewPlatform().setup.core;
    if (pinFilterStatus === undefined) {
      pinFilterStatus = uiSettings.get('filters:pinnedByDefault');
    }

    if (!Array.isArray(filters)) {
      filters = [filters];
    }

    // set the store of all filters
    // TODO: is this necessary?
    _.map(filters, filter => {
      filter.$state = {
        store: pinFilterStatus ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE,
      };
    });

    const mappedFilters = await mapAndFlattenFilters(this.indexPatterns, filters);
    const newFilters = this.mergeFilters(mappedFilters, this.filters);
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
      const newFilters = this.filters.slice(filterIndex, 1);
      this.handleStateUpdate(newFilters);
    }
  }

  public invertFilter(filter: Filter) {
    return toggleFilterNegated(filter);
  }

  public removeAll() {
    this.setFilters([]);
  }

  public async addFiltersAndChangeTimeFilter(filters: Filter[]) {
    const timeFilter = await extractTimeFilter(this.indexPatterns, filters);
    if (timeFilter) changeTimeFilter(timeFilter);
    this.addFilters(filters.filter(filter => filter !== timeFilter));
  }
}
