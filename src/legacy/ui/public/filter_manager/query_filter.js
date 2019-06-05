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

export function FilterBarQueryFilterProvider(Promise, indexPatterns, getAppState, globalState) {
  const queryFilter = {};

  let filterStateManager;
  let filterStateUpdateSubscription$;

  const update$ = new Subject();
  const fetch$ = new Subject();

  queryFilter.getUpdates$ = function () {
    return update$.asObservable();
  };

  queryFilter.getFetches$ = function () {
    return fetch$.asObservable();
  };

  queryFilter.getFilters = function () {
    return filterStateManager ? filterStateManager.getFilters() : [];
  };

  queryFilter.getAppFilters = function () {
    return filterStateManager ? filterStateManager.getAppFilters() : [];
  };

  queryFilter.getGlobalFilters = function () {
    return filterStateManager ? filterStateManager.getGlobalFilters() : [];
  };

  /**
   * Adds new filters to the scope and state
   * @param {object|array} filters Filter(s) to add
   * @param {bool} global Whether the filter should be added to global state
   * @returns {Promise} filter map promise
   */
  queryFilter.addFilters = function (filters, addToGlobalState) {
    return Promise.resolve(filterStateManager.addFilters(filters, addToGlobalState, false))
      .then(function (delayedChangeUpdate) {
        updateAppState();
        delayedChangeUpdate.update && delayedChangeUpdate.update();
      });
  };

  queryFilter.setFilters = filters => {
    return Promise.resolve(filterStateManager.setFilters(filters, false))
      .then(delayedChangeUpdate => {
        updateAppState();
        delayedChangeUpdate.update && delayedChangeUpdate.update();
      });
  };

  /**
   * Removes the filter from the proper state
   * @param {object} matchFilter The filter to remove
   */
  queryFilter.removeFilter = function (matchFilter) {
    const delayedChangeUpdate = filterStateManager.removeFilter(matchFilter, false);
    updateAppState();
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
    return this.filterStateManager.invertFilter(filter);
  };

  queryFilter.addFiltersAndChangeTimeFilter = async filters => {
    const timeFilter = await extractTimeFilter(indexPatterns, filters);
    if (timeFilter) changeTimeFilter(timeFilter);
    queryFilter.addFilters(filters.filter(filter => filter !== timeFilter));
  };

  initWatchers();

  return queryFilter;

  function updateAppState() {
    globalState.filters = filterStateManager.getGlobalFilters();
    getAppState().filters = filterStateManager.getAppFilters();
  }

  /**
   * Saves both app and global states, ensuring filters are persisted
   * @returns {object} Resulting filter list, app and global combined
   */
  function saveState() {
    const appState = getAppState();
    if (appState) appState.save();
    globalState.save();
  }

  function setupFilterManager(appFilters, globalFilters) {
    if (filterStateUpdateSubscription$) {
      filterStateUpdateSubscription$.unsubscribe();
    }

    filterStateManager = new FilterManager(indexPatterns, appFilters || [], globalFilters || []);
    update$.next();
    fetch$.next();

    filterStateUpdateSubscription$ = filterStateManager.getUpdates$().subscribe((shouldFetch) => {
      saveState();
      update$.next();
      if (shouldFetch) {
        fetch$.next();
      }
    });
  }

  /**
   * Initializes state watchers
   * @returns {void}
   */
  function initWatchers() {
    // This is a temporary solution to remove rootscope.
    // Moving forward, new filters will be explicitly pushed into the filter manager.
    setInterval(() => {
      const appState = getAppState();
      if (!appState || !globalState) return;

      const filtersChanged = (!filterStateManager ||
            !_.isEqual(appState.filters || [], filterStateManager.getAppFilters()) ||
            !_.isEqual(globalState.filters || [], filterStateManager.getGlobalFilters())
      );

      if (!filtersChanged) return;

      setupFilterManager(appState && appState.filters, globalState.filters);
    }, 50);
  }
}
