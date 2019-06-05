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

// @ts-ignore
import { onlyDisabled } from './lib/only_disabled';
// @ts-ignore
import { onlyStateChanged } from './lib/only_state_changed';
// @ts-ignore
import { mapAndFlattenFilters } from './lib/map_and_flatten_filters';
// @ts-ignore
import { uniqFilters } from './lib/uniq_filters';

interface PartitionedFilters {
  globalFilters: Filter[];
  appFilters: Filter[];
}

interface DelayedChangeNotification {
  callback: (() => void) | undefined;
}

export class FilterManager {
  filters: Filter[] = [];
  updated$: Subject<any> = new Subject();

  constructor(filters: Filter[]);
  constructor(filters: Filter[], globalFilters?: Filter[]) {
    if (globalFilters) {
      filters = this.mergeFilters(filters, globalFilters);
    }
    this.filters = filters || [];
  }

  private partitionFilters(): PartitionedFilters {
    const [globalFilters, appFilters] = _.partition(this.filters, filter => {
      return filter.$state.store === FilterStateStore.GLOBAL_STATE;
    });

    return {
      globalFilters,
      appFilters,
    };
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
    const { appFilters } = this.partitionFilters();
    return appFilters;
  }

  public getGlobalFilters() {
    const { globalFilters } = this.partitionFilters();
    return globalFilters;
  }

  public getUpdates$() {
    return this.updated$.asObservable();
  }

  public addFilters(filters: Filter[], emitChanged?: boolean): DelayedChangeNotification {
    if (!Array.isArray(filters)) {
      filters = [filters];
    }

    const newFilters = this.mergeFilters(filters, this.filters);

    let delayChangeNotification: DelayedChangeNotification = {
      callback: undefined,
    };

    if (emitChanged === false) {
      const filtersUpdated = this.filtersUpdated(newFilters);
      this.filters = newFilters;
      if (filtersUpdated) {
        delayChangeNotification = {
          callback: () => {
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

  public setFilters(newFilters: Filter[], emitChanged?: boolean): DelayedChangeNotification {
    let delayChangeNotification: DelayedChangeNotification = {
      callback: undefined,
    };

    if (emitChanged === false) {
      const filtersUpdated = this.filtersUpdated(newFilters);
      this.filters = newFilters;
      if (filtersUpdated) {
        delayChangeNotification = {
          callback: () => {
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

  public removeFilter(filter: Filter, emitChanged?: boolean): DelayedChangeNotification {
    let delayChangeNotification: DelayedChangeNotification = {
      callback: undefined,
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
            callback: () => {
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
}
