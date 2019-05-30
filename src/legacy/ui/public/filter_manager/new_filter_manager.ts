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

import { Filter, toggleFilterNegated } from '@kbn/es-query';

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

export class FilterManager {
  filters: any[] = [];
  globalFilters: any[] = [];
  updated$: Subject<any> = new Subject();

  constructor(filters: any[], globalFilters: any[]) {
    this.filters = filters || [];
    this.globalFilters = globalFilters || [];
  }

  private filtersUpdated(newFilters: any[], newGlobalFilters: any[]): boolean {
    const oldOnes = [this.filters, this.globalFilters];
    const newOnes = [newFilters, newGlobalFilters];

    return _.some(
      _.map(oldOnes, (oldOne, index) => {
        const newOne = newOnes[index];
        return !_.isEqual(newOne, oldOne);
      })
    );
  }

  private shouldFetch(newFilters: any[], newGlobalFilters: any[]) {
    const oldOnes = [this.filters, this.globalFilters];
    const newOnes = [newFilters, newGlobalFilters];

    return _.any(
      _.map(oldOnes, (oldOne, index) => {
        const newOne = newOnes[index];
        return !onlyDisabled(newOne, oldOne) && !onlyStateChanged(newOne, oldOne);
      })
    );
  }

  private mergeFilters(newFilters: any[], oldFilters: any[]): any[] {
    // Order matters!
    // uniqFilters will throw out duplicates from the back of the array,
    // but we want newer filters to overwrite previously created filters.
    return uniqFilters(newFilters.concat(oldFilters));
  }

  private emitUpdateIfChanged(newFilters: any[], newGlobalFilters: any[]) {
    // This is an optimization
    const shouldFetch = this.shouldFetch(newFilters, newGlobalFilters);
    if (this.filtersUpdated(newFilters, newGlobalFilters)) {
      this.updated$.next({
        shouldFetch,
      });
    }
  }

  public getAppFilters() {
    return this.filters;
  }

  public getGlobalFilters() {
    return this.globalFilters;
  }

  public getUpdates$() {
    return this.updated$.asObservable();
  }

  public addFilters(filters: any, addToGlobalState: boolean) {
    if (!Array.isArray(filters)) {
      filters = [filters];
    }

    const newAppFilters = this.mergeFilters(addToGlobalState ? [] : filters, this.filters);
    const newGlobalFilters = this.mergeFilters(addToGlobalState ? filters : [], this.globalFilters);

    this.setFilters(newAppFilters, newGlobalFilters);
  }

  public async setFilters(filters: Filter[], globalFilters: any[]) {
    this.emitUpdateIfChanged(filters, globalFilters);

    // set global and app
    this.filters = filters;
    this.globalFilters = globalFilters;
  }

  public updateFilter(filter: any): void {
    return;
  }

  public removeFilter(filter: any, removeFromGlobalState: boolean): void {
    return;
  }

  public invertFilter(filter: any) {
    return toggleFilterNegated(filter);
  }

  public removeAll() {
    this.setFilters([], []);
  }
}
