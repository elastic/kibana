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
import { Subject } from 'rxjs';

import { npSetup } from 'ui/new_platform';

// @ts-ignore
import { compareFilters } from './lib/compare_filters';
// @ts-ignore
import { mapAndFlattenFilters } from './lib/map_and_flatten_filters';
// @ts-ignore
import { uniqFilters } from './lib/uniq_filters';
// @ts-ignore
import { extractTimeFilter } from './lib/extract_time_filter';
// @ts-ignore
import { changeTimeFilter } from './lib/change_time_filter';

import { PartitionedFilters } from './partitioned_filters';

import { IndexPatterns } from '../../index_patterns';

export class FilterManager {
  private indexPatterns: IndexPatterns;
  private filters: Filter[] = [];
  private updated$: Subject<void> = new Subject();
  private fetch$: Subject<void> = new Subject();

  constructor(indexPatterns: IndexPatterns) {
    this.indexPatterns = indexPatterns;
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

    return FilterManager.mergeFilters(appFilters, globalFilters);
  }

  private static mergeFilters(appFilters: Filter[], globalFilters: Filter[]): Filter[] {
    return uniqFilters(appFilters.reverse().concat(globalFilters.reverse())).reverse();
  }

  private static partitionFilters(filters: Filter[]): PartitionedFilters {
    const [globalFilters, appFilters] = _.partition(filters, isFilterPinned);
    return {
      globalFilters,
      appFilters,
    };
  }

  private handleStateUpdate(newFilters: Filter[]) {
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

    const filtersUpdated = !_.isEqual(this.filters, newFilters);

    this.filters = newFilters;
    if (filtersUpdated) {
      this.updated$.next();
      // Fired together with updated$, because historically (~4 years ago) there was a fetch optimization, that didn't call fetch for very specific cases.
      // This optimization seems irrelevant at the moment, but I didn't want to change the logic of all consumers.
      this.fetch$.next();
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

    // Set the store of all filters. For now.
    // In the future, all filters should come in with filter state store already set.
    const store = pinFilterStatus ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE;
    FilterManager.setFiltersStore(filters, store);

    const mappedFilters = await mapAndFlattenFilters(this.indexPatterns, filters);

    // This is where we add new filters to the correct place (app \ global)
    const newPartitionedFilters = FilterManager.partitionFilters(mappedFilters);
    const currentFilters = this.getPartitionedFilters();
    currentFilters.appFilters.push(...newPartitionedFilters.appFilters);
    currentFilters.globalFilters.push(...newPartitionedFilters.globalFilters);

    const newFilters = this.mergeIncomingFilters(currentFilters);
    this.handleStateUpdate(newFilters);
  }

  public async setFilters(newFilters: Filter[]) {
    const mappedFilters = await mapAndFlattenFilters(this.indexPatterns, newFilters);
    const newPartitionedFilters = FilterManager.partitionFilters(mappedFilters);
    const mergedFilters = this.mergeIncomingFilters(newPartitionedFilters);
    this.handleStateUpdate(mergedFilters);
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

  public static setFiltersStore(filters: Filter[], store: FilterStateStore) {
    _.map(filters, (filter: Filter) => {
      // Override status only for filters that didn't have state in the first place.
      if (filter.$state === undefined) {
        filter.$state = { store };
      }
    });
  }
}
