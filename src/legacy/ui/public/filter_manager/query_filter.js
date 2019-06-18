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

import { onlyDisabled } from './lib/only_disabled';
import { onlyStateChanged } from './lib/only_state_changed';
import { uniqFilters } from './lib/uniq_filters';
import { compareFilters } from './lib/compare_filters';
import { mapAndFlattenFilters } from './lib/map_and_flatten_filters';
import { extractTimeFilter } from './lib/extract_time_filter';
import { changeTimeFilter } from './lib/change_time_filter';

import { npSetup } from 'ui/new_platform';

export function FilterBarQueryFilterProvider(Promise, indexPatterns, $rootScope, getAppState, globalState) {
  const queryFilter = {};
  const { uiSettings } = npSetup.core;

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
  };

  /**
   * Removes all filters
   */
  queryFilter.removeAll = function () {
    const appState = getAppState();
    appState.filters = [];
    globalState.filters = [];
  };

  /**
   * Toggles the filter between enabled/disabled.
   * @param {object} filter The filter to toggle
   & @param {boolean} force Disabled true/false
   * @returns {object} updated filter
   */
  queryFilter.toggleFilter = function (filter, force) {
    // Toggle the disabled flag
    const disabled = _.isUndefined(force) ? !filter.meta.disabled : !!force;
    filter.meta.disabled = disabled;
    return filter;
  };

  /**
   * Disables all filters
   * @params {boolean} force Disable/enable all filters
   */
  queryFilter.toggleAll = function (force) {
    function doToggle(filter) {
      queryFilter.toggleFilter(filter, force);
    }

    executeOnFilters(doToggle);
  };


  /**
   * Inverts the negate value on the filter
   * @param {object} filter The filter to toggle
   * @returns {object} updated filter
   */
  queryFilter.invertFilter = function (filter) {
    // Toggle the negate meta state
    filter.meta.negate = !filter.meta.negate;
    return filter;
  };

  /**
   * Inverts all filters
   * @returns {object} Resulting updated filter list
   */
  queryFilter.invertAll = function () {
    executeOnFilters(queryFilter.invertFilter);
  };


  /**
   * Pins the filter to the global state
   * @param {object} filter The filter to pin
   * @param {boolean} force pinned state
   * @returns {object} updated filter
   */
  queryFilter.pinFilter = function (filter, force) {
    const appState = getAppState();
    if (!appState) return filter;

    // ensure that both states have a filters property
    if (!Array.isArray(globalState.filters)) globalState.filters = [];
    if (!Array.isArray(appState.filters)) appState.filters = [];

    const appIndex = _.findIndex(appState.filters, appFilter => _.isEqual(appFilter, filter));

    if (appIndex !== -1 && force !== false) {
      appState.filters.splice(appIndex, 1);
      globalState.filters.push(filter);
    } else {
      const globalIndex = _.findIndex(globalState.filters, globalFilter => _.isEqual(globalFilter, filter));

      if (globalIndex === -1 || force === true) return filter;

      globalState.filters.splice(globalIndex, 1);
      appState.filters.push(filter);
    }

    return filter;
  };

  /**
   * Pins all filters
   * @params {boolean} force Pin/Unpin all filters
   */
  queryFilter.pinAll = function (force) {
    function pin(filter) {
      queryFilter.pinFilter(filter, force);
    }

    executeOnFilters(pin);
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

  // helper to run a function on all filters in all states
  function executeOnFilters(fn) {
    const appState = getAppState();
    let globalFilters = [];
    let appFilters = [];

    if (globalState.filters) globalFilters = globalState.filters;
    if (appState && appState.filters) appFilters = appState.filters;

    globalFilters.concat(appFilters).forEach(fn);
  }

  function mergeStateFilters(gFilters, aFilters, compareOptions) {
    // ensure we don't mutate the filters passed in
    const globalFilters = gFilters ? _.cloneDeep(gFilters) : [];
    const appFilters = aFilters ? _.cloneDeep(aFilters) : [];

    // existing globalFilters should be mutated by appFilters
    _.each(appFilters, function (filter, i) {
      const match = _.find(globalFilters, function (globalFilter) {
        return compareFilters(globalFilter, filter, compareOptions);
      });

      // no match, do nothing
      if (!match) return;

      // matching filter in globalState, update global and remove from appState
      _.assign(match.meta, filter.meta);
      appFilters.splice(i, 1);
    });

    // Reverse the order of globalFilters and appFilters, since uniqFilters
    // will throw out duplicates from the back of the array, but we want
    // newer filters to overwrite previously created filters.
    globalFilters.reverse();
    appFilters.reverse();

    return [
      // Reverse filters after uniq again, so they are still in the order, they
      // were before updating them
      uniqFilters(globalFilters).reverse(),
      uniqFilters(appFilters).reverse()
    ];
  }

  /**
   * Initializes state watchers that use the event emitter
   * @returns {void}
   */
  function initWatchers() {
    let removeAppStateWatchers;

    $rootScope.$watch(getAppState, function () {
      removeAppStateWatchers && removeAppStateWatchers();
      removeAppStateWatchers = initAppStateWatchers();
    });

    function initAppStateWatchers() {
      // multi watch on the app and global states
      const stateWatchers = [{
        fn: $rootScope.$watch,
        deep: true,
        get: queryFilter.getGlobalFilters
      }, {
        fn: $rootScope.$watch,
        deep: true,
        get: queryFilter.getAppFilters
      }];

      // when states change, use event emitter to trigger updates and fetches
      return $rootScope.$watchMulti(stateWatchers, function (next, prev) {
        // prevent execution on watcher instantiation
        if (_.isEqual(next, prev)) return;

        let doUpdate = false;
        let doFetch = false;

        // reconcile filter in global and app states
        const filters = mergeStateFilters(next[0], next[1]);
        const [globalFilters, appFilters] = filters;
        const appState = getAppState();

        // save the state, as it may have updated
        const globalChanged = !_.isEqual(next[0], globalFilters);
        const appChanged = !_.isEqual(next[1], appFilters);

        // the filters were changed, apply to state (re-triggers this watcher)
        if (globalChanged || appChanged) {
          globalState.filters = globalFilters;
          if (appState) appState.filters = appFilters;
          return;
        }

        // check for actions, bail if we're done
        getActions();
        if (doUpdate) {
          // save states and emit the required events
          saveState();
          update$.next();

          if (doFetch) {
            fetch$.next();
          }
        }

        // iterate over each state type, checking for changes
        function getActions() {
          let newFilters = [];
          let oldFilters = [];

          stateWatchers.forEach(function (watcher, i) {
            const nextVal = next[i];
            const prevVal = prev[i];
            newFilters = newFilters.concat(nextVal);
            oldFilters = oldFilters.concat(prevVal);

            // no update or fetch if there was no change
            if (nextVal === prevVal) return;

            if (nextVal) doUpdate = true;

            // don't trigger fetch when only disabled filters
            if (!onlyDisabled(nextVal, prevVal)) doFetch = true;
          });

          // make sure change wasn't only a state move
          // checking length first is an optimization
          if (doFetch && newFilters.length === oldFilters.length) {
            if (onlyStateChanged(newFilters, oldFilters)) doFetch = false;
          }
        }
      });
    }
  }
}
