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

import { extractTimeFilter } from './lib/extract_time_filter';
import { changeTimeFilter } from './lib/change_time_filter';
import { FilterManager } from './new_filter_manager';
import { FilterStateManager } from './filter_state_manager';

export function FilterBarQueryFilterProvider(indexPatterns, getAppState, globalState) {
  const queryFilter = {};

  let filterManager;
  let filterStateUpdateSubscription$;

  const filterStateManager = new FilterStateManager(globalState, getAppState);
  filterStateManager.getStateUpdated$().subscribe((partitionedFilters) => {
    const filtersChanged = (!filterManager ||
      !_.isEqual(partitionedFilters.appFilters || [], filterManager.getAppFilters()) ||
      !_.isEqual(partitionedFilters.globalFilters || [], filterManager.getGlobalFilters()));

    if (!filtersChanged) return;

    setupFilterManager(partitionedFilters);
  });


  filterStateManager.watchFilterState();

  const update$ = new Subject();
  const fetch$ = new Subject();

  queryFilter.getUpdates$ = function () {
    return update$.asObservable();
  };

  queryFilter.getFetches$ = function () {
    return fetch$.asObservable();
  };

  queryFilter.getFilters = function () {
    return filterManager ? filterManager.getFilters() : [];
  };

  queryFilter.getAppFilters = function () {
    return filterManager ? filterManager.getAppFilters() : [];
  };

  queryFilter.getGlobalFilters = function () {
    return filterManager ? filterManager.getGlobalFilters() : [];
  };

  /**
   * Adds new filters to the scope and state
   * @param {object|array} filters Filter(s) to add
   * @param {bool} global Whether the filter should be added to global state
   * @returns {Promise} filter map promise
   */
  queryFilter.addFilters = function (filters, addToGlobalState) {
    return filterManager.addFilters(filters, addToGlobalState, false)
      .then(function (delayedChangeUpdate) {
        filterStateManager.updateAppState(filterManager.getPartitionedFilters());
        delayedChangeUpdate.update && delayedChangeUpdate.update();
      });
  };

  queryFilter.setFilters = filters => {
    return filterManager.setFilters(filters, false)
      .then(delayedChangeUpdate => {
        filterStateManager.updateAppState(filterManager.getPartitionedFilters());
        delayedChangeUpdate.update && delayedChangeUpdate.update();
      });
  };

  /**
   * Removes the filter from the proper state
   * @param {object} matchFilter The filter to remove
   */
  queryFilter.removeFilter = function (matchFilter) {
    const delayedChangeUpdate = filterManager.removeFilter(matchFilter, false);
    filterStateManager.updateAppState(filterManager.getPartitionedFilters());
    delayedChangeUpdate.update && delayedChangeUpdate.update();
  };

  /**
   * Removes all filters
   */
  queryFilter.removeAll = function () {
    queryFilter.setFilters([]);
  };

  /**
   * Inverts the negate value on the filter
   * @param {object} filter The filter to toggle
   * @returns {object} updated filter
   */
  queryFilter.invertFilter = function (filter) {
    return filterManager.invertFilter(filter);
  };

  queryFilter.addFiltersAndChangeTimeFilter = async filters => {
    const timeFilter = await extractTimeFilter(indexPatterns, filters);
    if (timeFilter) changeTimeFilter(timeFilter);
    queryFilter.addFilters(filters.filter(filter => filter !== timeFilter));
  };

  return queryFilter;

  function setupFilterManager(partitionedFilters) {
    if (filterStateUpdateSubscription$) {
      filterStateUpdateSubscription$.unsubscribe();
    }

    filterManager = new FilterManager(indexPatterns, partitionedFilters);
    update$.next();
    fetch$.next();

    filterStateUpdateSubscription$ = filterManager.getUpdates$().subscribe((shouldFetch) => {
      filterStateManager.saveState();
      update$.next();
      if (shouldFetch) {
        fetch$.next();
      }
    });
  }
}
