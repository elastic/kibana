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

interface DelayedChangeNotification {
  update: (() => void) | undefined;
}

export class FilterManager {
  indexPatterns: any;
  filters: Filter[] = [];
  updated$: Subject<any> = new Subject();

  constructor(indexPatterns: any, partitionedFilters: PartitionedFilters) {
    this.indexPatterns = indexPatterns;
    this.filters = this.mergeFilters(
      partitionedFilters.appFilters,
      partitionedFilters.globalFilters
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
    const [globalFilters, appFilters] = _.partition(this.filters, filter => {
      return filter.$state.store === FilterStateStore.GLOBAL_STATE;
    });

    return {
      globalFilters,
      appFilters,
    };
  }

  public getUpdates$() {
    return this.updated$.asObservable();
  }

  public async addFilters(
    filters: Filter[],
    pinFilterStatus?: boolean,
    emitChanged?: boolean
  ): Promise<DelayedChangeNotification> {
    const { uiSettings } = getNewPlatform().setup.core;
    if (pinFilterStatus === undefined) {
      pinFilterStatus = uiSettings.get('filters:pinnedByDefault');
    }

    if (!Array.isArray(filters)) {
      filters = [filters];
    }

    // set the store of all filters
    _.map(filters, filter => {
      filter.$state = {
        store: pinFilterStatus ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE,
      };
    });

    const mappedFilters = await mapAndFlattenFilters(this.indexPatterns, filters);

    const newFilters = this.mergeFilters(mappedFilters, this.filters);

    let delayChangeNotification: DelayedChangeNotification = {
      update: undefined,
    };

    if (emitChanged === false) {
      const filtersUpdated = this.filtersUpdated(newFilters);
      this.filters = newFilters;
      if (filtersUpdated) {
        delayChangeNotification = {
          update: () => {
            this.updated$.next();
          },
        };
      }
    } else {
      this.emitUpdateIfChanged(newFilters);
      this.filters = newFilters;
    }

    return delayChangeNotification;
  }

  public async setFilters(
    newFilters: Filter[],
    emitChanged?: boolean
  ): Promise<DelayedChangeNotification> {
    let delayChangeNotification: DelayedChangeNotification = {
      update: undefined,
    };

    const mappedFilters = await mapAndFlattenFilters(this.indexPatterns, newFilters);

    if (emitChanged === false) {
      const filtersUpdated = this.filtersUpdated(mappedFilters);
      this.filters = mappedFilters;
      if (filtersUpdated) {
        delayChangeNotification = {
          update: () => {
            this.updated$.next();
          },
        };
      }
    } else {
      this.emitUpdateIfChanged(mappedFilters);
      this.filters = mappedFilters;
    }

    return delayChangeNotification;
  }

  public removeFilter(filter: Filter, emitChanged?: boolean): DelayedChangeNotification {
    let delayChangeNotification: DelayedChangeNotification = {
      update: undefined,
    };

    const filterIndex = _.findIndex(this.filters, item => {
      return _.isEqual(item.meta, filter.meta) && _.isEqual(item.query, filter.query);
    });

    const newFilters = this.filters.slice(filterIndex, 1);

    if (filterIndex >= 0) {
      if (emitChanged === false) {
        const filtersUpdated = this.filtersUpdated(newFilters);
        this.filters = newFilters;
        if (filtersUpdated) {
          delayChangeNotification = {
            update: () => {
              this.updated$.next();
            },
          };
        }
      } else {
        this.emitUpdateIfChanged(newFilters);
        this.filters = newFilters;
      }
    }
    return delayChangeNotification;
  }

  public invertFilter(filter: Filter) {
    return toggleFilterNegated(filter);
  }

  public removeAll() {
    this.setFilters([]);
  }

  public async addFiltersAndChangeTimeFilter(
    filters: Filter[],
    emitChanged?: boolean
  ): Promise<DelayedChangeNotification> {
    const timeFilter = await extractTimeFilter(this.indexPatterns, filters);
    if (timeFilter) changeTimeFilter(timeFilter);
    return this.addFilters(filters.filter(filter => filter !== timeFilter), undefined, emitChanged);
  }
}
