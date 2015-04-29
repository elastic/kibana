define(function (require) {
  var _ = require('lodash');

  return function (Private, $rootScope, getAppState, globalState) {
    var EventEmitter = Private(require('factories/events'));
    var onlyDisabled = require('components/filter_bar/lib/onlyDisabled');
    var uniqFilters = require('components/filter_bar/lib/uniqFilters');
    var compareFilters = require('components/filter_bar/lib/compareFilters');

    var queryFilter = new EventEmitter();

    queryFilter.getFilters = function () {
      var compareOptions = { disabled: true, negate: true };
      var appFilters = queryFilter.getAppFilters();
      var globalFilters = queryFilter.getGlobalFilters();

      return uniqFilters(globalFilters.concat(appFilters), compareOptions);
    };

    queryFilter.getAppFilters = function () {
      var appState = getAppState();
      if (!appState || !appState.filters) return [];
      return (appState.filters) ? _.map(appState.filters, appendStoreType('appState')) : [];
    };

    queryFilter.getGlobalFilters = function () {
      if (!globalState.filters) return [];
      return _.map(globalState.filters, appendStoreType('globalState'));
    };

    /**
     * Adds new filters to the scope and state
     * @param {object|array} fitlers Filter(s) to add
     * @param {bool} global Should be added to global state
     * @returns {object} Resulting new filter list
     */
    queryFilter.addFilters = function (filters, global) {
      var appState = getAppState();
      var state = (global) ? globalState : appState;

      if (!_.isArray(filters)) {
        filters = [filters];
      }

      // simply concat global filters, they will be deduped
      if (global) {
        globalState.filters = globalState.filters.concat(filters);
      } else if (appState) {
        if (!appState.filters) appState.filters = [];
        appState.filters = appState.filters.concat(filters);
      }

      return saveState();
    };

    /**
     * Removes the filter from the proper state
     * @param {object} matchFilter The filter to remove
     * @returns {object} Resulting new filter list
     */
    queryFilter.removeFilter = function (matchFilter) {
      var state = getStateByFilter(matchFilter);
      if (!state) return;

      _.pull(state.filters, matchFilter);
      return saveState();
    };

    /**
     * Removes all filters
     * @returns {object} Resulting new filter list
     */
    queryFilter.removeAll = function () {
      var appState = getAppState();
      appState.filters = [];
      globalState.filters = [];
      return saveState();
    };

    /**
     * Toggles the filter between enabled/disabled.
     * @param {object} filter The filter to toggle
     & @param {boolean} force Disabled true/false
     * @returns {object} updated filter
     */
    queryFilter.toggleFilter = function (filter, force) {
      // Toggle the disabled flag
      var disabled = _.isUndefined(force) ? !filter.meta.disabled : !!force;
      filter.meta.disabled = disabled;

      // Save the filters back to the searchSource
      saveState();
      return filter;
    };

    /**
     * Disables all filters
     * @params {boolean} force Disable/enable all filters
     * @returns {object} Resulting updated filter list
     */
    queryFilter.toggleAll = function (force) {
      function doToggle(filter) {
        queryFilter.toggleFilter(filter, force);
      }

      executeOnFilters(doToggle);
      return queryFilter.getFilters();
    };


    /**
     * Inverts the nagate value on the filter
     * @param {object} filter The filter to toggle
     * @returns {object} updated filter
     */
    queryFilter.invertFilter = function (filter) {
      // Toggle the negate meta state
      filter.meta.negate = !filter.meta.negate;

      saveState();
      return filter;
    };

    /**
     * Inverts all filters
     * @returns {object} Resulting updated filter list
     */
    queryFilter.invertAll = function () {
      executeOnFilters(queryFilter.invertFilter);
      return queryFilter.getFilters();
    };


    /**
     * Pins the filter to the global state
     * @param {object} filter The filter to pin
     * @param {boolean} force pinned state
     * @returns {object} filter passed in
     */
    queryFilter.pinFilter = function (filter, force) {
      var appState = getAppState();
      if (!appState) return filter;

      // ensure that both states have a filters property
      if (!_.isArray(globalState.filters)) globalState.filters = [];
      if (!_.isArray(appState.filters)) appState.filters = [];

      var appIndex = _.indexOf(appState.filters, filter);
      var globalIndex = _.indexOf(globalState.filters, filter);
      if (appIndex === -1 && globalIndex === -1) return;

      if (appIndex !== -1) {
        appState.filters.splice(appIndex, 1);
        globalState.filters.push(filter);
      } else {
        globalState.filters.splice(appIndex, 1);
        appState.filters.push(filter);
      }

      saveState();
      return filter;
    };

    /**
     * Pins all filters
     * @params {boolean} force Pin/Unpin all filters
     * @returns {object} Resulting updated filter list
     */
    queryFilter.pinAll = function (force) {
      function pin(filter) {
        queryFilter.pinFilter(filter, force);
      }

      executeOnFilters(pin);
      return queryFilter.getFilters();
    };

    initWatchers();

    return queryFilter;

    /**
     * Saves both app and global states, ensuring filters are persisted
     * @returns {object} Resulting filter list, app and global combined
     */
    function saveState() {
      var appState = getAppState();
      var globalFilters = globalState.filters || [];

      if (appState) {
        var appFilters = appState.filters || [];

        // app filters need to mutate global filter state
        // if they match existing global filters
        var compareOptions = { disabled: true };
        appFilters = _.filter(appFilters, function (filter) {
          var match = _.find(globalFilters, function (globalFilter) {
            return compareFilters(globalFilter, filter, compareOptions);
          });

          // if the filter remains, it doesn't match any filters in global state
          if (!match) return true;

          // filter matches a filter in globalFilters, mutate existing global filter
          match.meta = filter.meta;
          return false;
        });

        appState.filters = uniqFilters(appFilters, { disabled: true });
        appState.save();
      }

      globalState.filters = uniqFilters(globalFilters, { disabled: true });
      globalState.save();
      return queryFilter.getFilters();
    }

    function appendStoreType(type) {
      return function (filter) {
        filter.$state = {
          store: type
        };
        return filter;
      };
    }

    // get state (app or global) or the filter passed in
    function getStateByFilter(filter) {
      var appState = getAppState();
      if (appState) {
        var appIndex = _.indexOf(appState.filters, filter);
        if (appIndex !== -1) return appState;
      }

      var globalIndex = _.indexOf(globalState.filters, filter);
      if (globalIndex !== -1) return globalState;

      return false;
    }

    function executeOnFilters(fn) {
      var appState = getAppState();
      appState.filters.forEach(fn);
      globalState.filters.forEach(fn);
    }

    /**
     * Initializes state watchers that use the event emitter
     * @returns {void}
     */
    function initWatchers() {
      var removeAppStateWatchers;

      $rootScope.$watch(getAppState, function () {
        removeAppStateWatchers && removeAppStateWatchers();
        removeAppStateWatchers = initAppStateWatchers();
      });

      function initAppStateWatchers() {
        // multi watch on the app and global states
        var stateWatchers = [{
          fn: $rootScope.$watch,
          deep: true,
          get: queryFilter.getAppFilters
        }, {
          fn: $rootScope.$watch,
          deep: true,
          get: queryFilter.getGlobalFilters
        }];

        // when states change, use event emitter to trigger updates and fetches
        return $rootScope.$watchMulti(stateWatchers, function (next, prev) {
          var doUpdate = false;
          var doFetch = false;

          stateWatchers.forEach(function (watcher, i) {
            var nextVal = next[i];
            var prevVal = prev[i];

            if (nextVal === prevVal) return;
            if (nextVal) doUpdate = true;
            // don't trigger fetch when only disabled filters
            if (!onlyDisabled(nextVal, prevVal)) doFetch = true;
          });

          if (!doUpdate) return;

          return queryFilter.emit('update')
          .then(function () {
            if (!doFetch) return;
            return queryFilter.emit('fetch');
          });
        });
      }
    }
  };
});
