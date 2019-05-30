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

import { uniqFilters } from './lib/uniq_filters';
import { mapAndFlattenFilters } from './lib/map_and_flatten_filters';
import { extractTimeFilter } from './lib/extract_time_filter';
import { changeTimeFilter } from './lib/change_time_filter';

import { getNewPlatform } from 'ui/new_platform';

import { FilterManager } from './new_filter_manager';

export function FilterBarQueryFilterProvider(Promise, indexPatterns, getAppState, globalState) {
  const queryFilter = {};

  let filterStateManager;
  const { uiSettings } = getNewPlatform().setup.core;

  const update$ = new Subject();
  const fetch$ = new Subject();

  queryFilter.getUpdates$ = function () {
    return update$.asObservable();
  };

  queryFilter.getFetches$ = function () {
    return fetch$.asObservable();
  };

  queryFilter.getFilters = function () {
    const compareOptions = { disabled: true, negate: true };
    const appFilters = queryFilter.getAppFilters();
    const globalFilters = queryFilter.getGlobalFilters();

    return uniqFilters(globalFilters.concat(appFilters), compareOptions);
  };

  queryFilter.getAppFilters = function () {
    const appState = getAppState();
    if (!appState || !appState.filters) return [];

    // Work around for https://github.com/elastic/kibana/issues/5896
    appState.filters = validateStateFilters(appState);

    return (appState.filters) ? _.map(appState.filters, appendStoreType('appState')) : [];
  };

  queryFilter.getGlobalFilters = function () {
    if (!globalState.filters) return [];

    // Work around for https://github.com/elastic/kibana/issues/5896
    globalState.filters = validateStateFilters(globalState);

    return _.map(globalState.filters, appendStoreType('globalState'));
  };

  /**
   * Adds new filters to the scope and state
   * @param {object|array} filters Filter(s) to add
   * @param {bool} global Whether the filter should be added to global state
   * @returns {Promise} filter map promise
   */
  queryFilter.addFilters = function (filters, addToGlobalState) {
    if (addToGlobalState === undefined) {
      addToGlobalState = uiSettings.get('filters:pinnedByDefault');
    }

    // Determine the state for the new filter (whether to pass the filter through other apps or not)
    const appState = getAppState();
    const filterState = addToGlobalState ? globalState : appState;

    if (!Array.isArray(filters)) {
      filters = [filters];
    }

    return Promise.resolve(mapAndFlattenFilters(indexPatterns, filters))
      .then(function (filters) {
        if (!filterState.filters) {
          filterState.filters = [];
        }

        filterState.filters = filterState.filters.concat(filters);

        filterStateManager.addFilters(filters, addToGlobalState);
      });
  };

  /**
   * Removes the filter from the proper state
   * @param {object} matchFilter The filter to remove
   */
  queryFilter.removeFilter = function (matchFilter) {
    const appState = getAppState();
    const filter = _.omit(matchFilter, ['$$hashKey']);
    let state;
    let index;

    // check for filter in appState
    if (appState) {
      index = _.findIndex(appState.filters, filter);
      if (index !== -1) state = appState;
    }

    // if not found, check for filter in globalState
    if (!state) {
      index = _.findIndex(globalState.filters, filter);
      if (index !== -1) state = globalState;
      else return; // not found in either state, do nothing
    }

    state.filters.splice(index, 1);

    filterStateManager.setFilters(appState.filters, globalState.filters);
  };

  /**
   * Removes all filters
   */
  queryFilter.removeAll = function () {
    const appState = getAppState();
    appState.filters = [];
    globalState.filters = [];

    filterStateManager.removeAll();
  };

  /**
   * Inverts the negate value on the filter
   * @param {object} filter The filter to toggle
   * @returns {object} updated filter
   */
  queryFilter.invertFilter = function (filter) {
    return this.filterStateManager.invertFilter(filter);
  };

  queryFilter.setFilters = filters => {
    return Promise.resolve(mapAndFlattenFilters(indexPatterns, filters))
      .then(mappedFilters => {
        const appState = getAppState();
        const [globalFilters, appFilters] = _.partition(mappedFilters, filter => {
          return filter.$state.store === 'globalState';
        });
        globalState.filters = globalFilters;
        if (appState) appState.filters = appFilters;

        filterStateManager.setFilters(appFilters, globalFilters);
      });
  };

  queryFilter.addFiltersAndChangeTimeFilter = async filters => {
    const timeFilter = await extractTimeFilter(indexPatterns, filters);
    if (timeFilter) changeTimeFilter(timeFilter);
    queryFilter.addFilters(filters.filter(filter => filter !== timeFilter));
  };

  initWatchers();

  return queryFilter;

  /**
   * Rids filter list of null values and replaces state if any nulls are found
   */
  function validateStateFilters(state) {
    const compacted = _.compact(state.filters);
    if (state.filters.length !== compacted.length) {
      state.filters = compacted;
      state.replace();
    }
    return state.filters;
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

  function appendStoreType(type) {
    return function (filter) {
      filter.$state = {
        store: type
      };
      return filter;
    };
  }

  /**
   * Initializes state watchers that use the event emitter
   * @returns {void}
   */
  function initWatchers() {
    // This is a temporary solution to remove rootscope.
    // Looking forward, new filters will be explicitly pushed into the filter manager.
    const interval = setInterval(() => {
      const appState = getAppState();
      if (appState && appState.filters) {
        clearInterval(interval);
        filterStateManager = new FilterManager(appState.filters);
        filterStateManager.getUpdates$().subscribe((shouldFetch) => {
          saveState();
          update$.next();
          if (shouldFetch) {
            fetch$.next();
          }
        });
      }
    }, 100);
  }
}
