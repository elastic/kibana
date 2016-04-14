define(function (require) {
  let _ = require('lodash');

  return function (Private, $rootScope, getAppState, globalState) {
    let EventEmitter = Private(require('ui/events'));
    let onlyDisabled = require('ui/filter_bar/lib/onlyDisabled');
    let onlyStateChanged = require('ui/filter_bar/lib/onlyStateChanged');
    let uniqFilters = require('ui/filter_bar/lib/uniqFilters');
    let compareFilters = require('ui/filter_bar/lib/compareFilters');
    let mapAndFlattenFilters = Private(require('ui/filter_bar/lib/mapAndFlattenFilters'));
    let angular = require('angular');

    let queryFilter = new EventEmitter();

    queryFilter.getFilters = function () {
      let compareOptions = { disabled: true, negate: true };
      let appFilters = queryFilter.getAppFilters();
      let globalFilters = queryFilter.getGlobalFilters();

      return uniqFilters(globalFilters.concat(appFilters), compareOptions);
    };

    queryFilter.getAppFilters = function () {
      let appState = getAppState();
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
     * @param {object|array} fitlers Filter(s) to add
     * @param {bool} global Should be added to global state
     * @retuns {Promise} filter map promise
     */
    queryFilter.addFilters = function (filters, global) {
      let appState = getAppState();
      let state = (global) ? globalState : appState;

      if (!_.isArray(filters)) {
        filters = [filters];
      }

      return mapAndFlattenFilters(filters)
      .then(function (filters) {
        if (global) {
          // simply concat global filters, they will be deduped
          globalState.filters = globalState.filters.concat(filters);
        } else if (appState) {
          if (!appState.filters) appState.filters = [];
          appState.filters = appState.filters.concat(filters);
        }
      });
    };

    /**
     * Removes the filter from the proper state
     * @param {object} matchFilter The filter to remove
     */
    queryFilter.removeFilter = function (matchFilter) {
      let appState = getAppState();
      let filter = _.omit(matchFilter, ['$$hashKey']);
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
    * Updates an existing filter
    * @param {object} filter Contains a reference to a filter and its new model
    * @param {object} filter.source The filter reference
    * @param {string} filter.model The edited filter
    * @returns {object} Promise that resolves to the new filter on a successful merge
    */
    queryFilter.updateFilter = function (filter) {
      let mergedFilter = _.assign({}, filter.source, filter.model);
      mergedFilter.meta.alias = filter.alias;
      //If the filter type is changed we want to discard the old type
      //when merging changes back in
      let filterTypeReplaced = filter.model[filter.type] !== mergedFilter[filter.type];
      if (filterTypeReplaced) {
        delete mergedFilter[filter.type];
      }

      return angular.copy(mergedFilter, filter.source);
    };

    /**
     * Removes all filters
     */
    queryFilter.removeAll = function () {
      let appState = getAppState();
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
      let disabled = _.isUndefined(force) ? !filter.meta.disabled : !!force;
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
     * Inverts the nagate value on the filter
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
      let appState = getAppState();
      if (!appState) return filter;

      // ensure that both states have a filters property
      if (!_.isArray(globalState.filters)) globalState.filters = [];
      if (!_.isArray(appState.filters)) appState.filters = [];

      let appIndex = _.indexOf(appState.filters, filter);

      if (appIndex !== -1 && force !== false) {
        appState.filters.splice(appIndex, 1);
        globalState.filters.push(filter);
      } else {
        let globalIndex = _.indexOf(globalState.filters, filter);

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

    initWatchers();

    return queryFilter;

    /**
     * Rids filter list of null values and replaces state if any nulls are found
     */
    function validateStateFilters(state) {
      let compacted = _.compact(state.filters);
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
      let appState = getAppState();
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
      let appState = getAppState();
      let globalFilters = [];
      let appFilters = [];

      if (globalState.filters) globalFilters = globalState.filters;
      if (appState && appState.filters) appFilters = appState.filters;

      globalFilters.concat(appFilters).forEach(fn);
    }

    function mergeStateFilters(gFilters, aFilters, compareOptions) {
      // ensure we don't mutate the filters passed in
      let globalFilters = gFilters ? _.cloneDeep(gFilters) : [];
      let appFilters = aFilters ? _.cloneDeep(aFilters) : [];
      compareOptions = _.defaults(compareOptions || {}, { disabled: true });

      // existing globalFilters should be mutated by appFilters
      _.each(appFilters, function (filter, i) {
        let match = _.find(globalFilters, function (globalFilter) {
          return compareFilters(globalFilter, filter, compareOptions);
        });

        // no match, do nothing
        if (!match) return;

        // matching filter in globalState, update global and remove from appState
        _.assign(match.meta, filter.meta);
        appFilters.splice(i, 1);
      });

      return [
        uniqFilters(globalFilters, { disabled: true }),
        uniqFilters(appFilters, { disabled: true })
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
        let stateWatchers = [{
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
          let filters = mergeStateFilters(next[0], next[1]);
          let globalFilters = filters[0];
          let appFilters = filters[1];
          let appState = getAppState();

          // save the state, as it may have updated
          let globalChanged = !_.isEqual(next[0], globalFilters);
          let appChanged = !_.isEqual(next[1], appFilters);

          // the filters were changed, apply to state (re-triggers this watcher)
          if (globalChanged || appChanged) {
            globalState.filters = globalFilters;
            if (appState) appState.filters = appFilters;
            return;
          }

          // check for actions, bail if we're done
          getActions();
          if (!doUpdate) return;

          // save states and emit the required events
          saveState();
          queryFilter.emit('update')
          .then(function () {
            if (!doFetch) return;
            queryFilter.emit('fetch');
          });

          // iterate over each state type, checking for changes
          function getActions() {
            let newFilters = [];
            let oldFilters = [];

            stateWatchers.forEach(function (watcher, i) {
              let nextVal = next[i];
              let prevVal = prev[i];
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
  };
});
