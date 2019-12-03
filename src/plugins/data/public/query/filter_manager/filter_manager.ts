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
import { Subject } from 'rxjs';

import { IUiSettingsClient } from 'src/core/public';

import { compareFilters } from './lib/compare_filters';
import { mapAndFlattenFilters } from './lib/map_and_flatten_filters';
import { uniqFilters } from './lib/uniq_filters';
import { onlyDisabledFiltersChanged } from './lib/only_disabled';
import { PartitionedFilters } from './types';
import { esFilters } from '../../../common';

export class FilterManager {
  private filters: esFilters.Filter[] = [];
  private updated$: Subject<void> = new Subject();
  private fetch$: Subject<void> = new Subject();
  private uiSettings: IUiSettingsClient;

  constructor(uiSettings: IUiSettingsClient) {
    this.uiSettings = uiSettings;
  }

  private mergeIncomingFilters(partitionedFilters: PartitionedFilters): esFilters.Filter[] {
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

  private static mergeFilters(
    appFilters: esFilters.Filter[],
    globalFilters: esFilters.Filter[]
  ): esFilters.Filter[] {
    return uniqFilters(appFilters.reverse().concat(globalFilters.reverse())).reverse();
  }

  private static partitionFilters(filters: esFilters.Filter[]): PartitionedFilters {
    const [globalFilters, appFilters] = _.partition(filters, esFilters.isFilterPinned);
    return {
      globalFilters,
      appFilters,
    };
  }

  private handleStateUpdate(newFilters: esFilters.Filter[]) {
    // global filters should always be first

    newFilters.sort(({ $state: a }: esFilters.Filter, { $state: b }: esFilters.Filter): number => {
      if (a!.store === b!.store) {
        return 0;
      } else {
        return a!.store === esFilters.FilterStateStore.GLOBAL_STATE &&
          b!.store !== esFilters.FilterStateStore.GLOBAL_STATE
          ? -1
          : 1;
      }
    });

    const filtersUpdated = !_.isEqual(this.filters, newFilters);
    const updatedOnlyDisabledFilters = onlyDisabledFiltersChanged(newFilters, this.filters);

    this.filters = newFilters;
    if (filtersUpdated) {
      this.updated$.next();
      if (!updatedOnlyDisabledFilters) {
        this.fetch$.next();
      }
    }
  }

  /* Getters */

  public getFilters() {
    return _.cloneDeep(this.filters);
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
    return FilterManager.partitionFilters(this.getFilters());
  }

  public getUpdates$() {
    return this.updated$.asObservable();
  }

  public getFetches$() {
    return this.fetch$.asObservable();
  }

  /* Setters */

  public addFilters(filters: esFilters.Filter[] | esFilters.Filter, pinFilterStatus?: boolean) {
    if (!Array.isArray(filters)) {
      filters = [filters];
    }

    if (filters.length === 0) {
      return;
    }

    if (pinFilterStatus === undefined) {
      pinFilterStatus = this.uiSettings.get('filters:pinnedByDefault');
    }

    // Set the store of all filters. For now.
    // In the future, all filters should come in with filter state store already set.
    const store = pinFilterStatus
      ? esFilters.FilterStateStore.GLOBAL_STATE
      : esFilters.FilterStateStore.APP_STATE;

    FilterManager.setFiltersStore(filters, store);

    const mappedFilters = mapAndFlattenFilters(filters);

    // This is where we add new filters to the correct place (app \ global)
    const newPartitionedFilters = FilterManager.partitionFilters(mappedFilters);
    const currentFilters = this.getPartitionedFilters();
    currentFilters.appFilters.push(...newPartitionedFilters.appFilters);
    currentFilters.globalFilters.push(...newPartitionedFilters.globalFilters);

    const newFilters = this.mergeIncomingFilters(currentFilters);
    this.handleStateUpdate(newFilters);
  }

  public setFilters(newFilters: esFilters.Filter[]) {
    const mappedFilters = mapAndFlattenFilters(newFilters);
    const newPartitionedFilters = FilterManager.partitionFilters(mappedFilters);
    const mergedFilters = this.mergeIncomingFilters(newPartitionedFilters);
    this.handleStateUpdate(mergedFilters);
  }

  public removeFilter(filter: esFilters.Filter) {
    const filterIndex = _.findIndex(this.filters, item => {
      return _.isEqual(item.meta, filter.meta) && _.isEqual(item.query, filter.query);
    });

    if (filterIndex >= 0) {
      const newFilters = _.cloneDeep(this.filters);
      newFilters.splice(filterIndex, 1);
      this.handleStateUpdate(newFilters);
    }
  }

  public removeAll() {
    this.setFilters([]);
  }

  public static setFiltersStore(filters: esFilters.Filter[], store: esFilters.FilterStateStore) {
    _.map(filters, (filter: esFilters.Filter) => {
      // Override status only for filters that didn't have state in the first place.
      if (filter.$state === undefined) {
        filter.$state = { store };
      }
    });
  }
}
