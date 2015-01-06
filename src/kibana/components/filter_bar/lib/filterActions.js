define(function (require) {
  var _ = require('lodash');
  var filterAppliedAndUnwrap = require('components/filter_bar/lib/filterAppliedAndUnwrap');
  var saveFilterState = require('components/filter_bar/lib/saveFilterState');

  return function (globalState) {
    return function ($scope) {
      var saveState = saveFilterState($scope.state, globalState);
      applyGlobalFilters();

      var exports = {
        toggleFilter: toggleFilter,
        toggleAll: toggleAll,
        pinFilter: pinFilter,
        pinAll: pinAll,
        invertFilter: invertFilter,
        invertAll: invertAll,
        addFilters: addFilters,
        removeFilter: removeFilter,
        removeAll: removeAll
      };

      return _.assign({
        apply: function () {
          _.each(Object.keys(exports), function (method) {
            $scope[method] = exports[method];
          });
        },
      }, exports);

      /**
       * Reads filters from global state and applies them to the scope state
       * @returns {void}
       */
      function applyGlobalFilters() {
        var filters = ($scope.state && $scope.state.filters) ? $scope.state.filters.filter(function (filter) {
          return !filter.meta.pinned;
        }) : [];
        var globalFilters = (globalState.filters) ? globalState.filters.filter(function (filter) {
          return filter.meta.pinned;
        }) : [];
        $scope.filters = _.union(filters, globalFilters);
        saveState($scope.filters);
      }

      /**
       * Toggles the filter between enabled/disabled.
       * @param {object} filter The filter to toggle
       & @param {boolean} force disabled true/false
       * @returns {object} filter passed in
       */
      function toggleFilter(filter, force) {
        // Toggle the disabled flag
        var disabled = _.isUndefined(force) ? !filter.meta.disabled : force;
        filter.meta.disabled = disabled;

        // Save the filters back to the searchSource
        saveState($scope.filters);
        return filter;
      }

      /**
       * Disables all filters
       * @params {boolean} force disable/enable all filters
       * @returns {void}
       */
      function toggleAll(force) {
        $scope.filters.forEach(function (filter) {
          toggleFilter(filter, force);
        });
      }

      /**
       * Pins the filter to the global state
       * @param {object} filter The filter to pin
       * @param {boolean} force pinned state
       * @returns {object} filter passed in
       */
      function pinFilter(filter, force) {
        var pinned = _.isUndefined(force) ? !filter.meta.pinned : force;
        filter.meta.pinned = !!pinned;

        saveState($scope.filters);
        return filter;
      }

      /**
       * Pins all filters
       * @params {boolean} force pin/unpin all filters
       * @returns {void}
       */
      function pinAll(force) {
        $scope.filters.forEach(function (filter) {
          pinFilter(filter, force);
        });
      }

      /**
       * Inverts the nagate value on the filter
       * @param {object} filter The filter to toggle
       * @returns {object} filter passed in
       */
      function invertFilter(filter) {
        // Toggle the negate meta state
        filter.meta.negate = !filter.meta.negate;

        saveState($scope.filters);
        return filter;
      }

      /**
       * Inverts all filters
       * @returns {void}
       */
      function invertAll() {
        $scope.filters.forEach(function (filter) {
          invertFilter(filter);
        });
      }

      /**
       * Adds new filters to the scope and state
       * @param {object|array} filter(s) to add
       * @returns {object} resulting new filter list
       */
      function addFilters(filters) {
        if (!_.isArray(filters)) {
          filters = [filters];
        }

        var newFilters = filterAppliedAndUnwrap(filters);
        $scope.filters = _.union($scope.filters, newFilters);

        saveState($scope.filters);
        return $scope.filters;
      }

      /**
       * Removes the filter from the searchSource
       * @param {object} filter The filter to remove
       * @returns {object} resulting new filter list
       */
      function removeFilter(invalidFilter) {
        // Remove the filter from the the scope $filters and map it back
        // to the original format to save in searchSource
        $scope.filters = _.filter($scope.filters, function (filter) {
          return filter !== invalidFilter;
        });

        saveState($scope.filters);
        return $scope.filters;
      }

      /**
       * Removes all filters
       * @returns {void}
       */
      function removeAll() {
        $scope.filters = [];
        saveState($scope.filters);
      }
    };
  };
});
