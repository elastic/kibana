define(function (require) {
  var _ = require('lodash');

  return function (globalState) {
    return function ($scope) {
      var exports = {
        toggleFilter: toggleFilter,
        toggleAll: toggleAll,
        pinFilter: pinFilter,
        pinAll: pinAll,
        invertFilter: invertFilter,
        invertAll: invertAll,
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
       * Toggles the filter between enabled/disabled.
       * @param {object} filter The filter to toggle
       & @param {boolean} force disabled true/false
       * @returns {void}
       */
      function toggleFilter(filter, force) {
        // Toggle the disabled flag
        var disabled = _.isUndefined(force) ? !filter.meta.disabled : force;
        filter.meta.disabled = disabled;

        // Save the filters back to the searchSource
        saveState();
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
       & @param {boolean} force pinned state
       * @returns {void}
       */
      function pinFilter(filter, force) {
        var pinned = _.isUndefined(force) ? !filter.meta.pinned : force;
        filter.meta.pinned = pinned;

        // Save the filters back to the searchSource
        saveState();
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
       & @param {boolean} force disabled true/false
       * @returns {void}
       */
      function invertFilter(filter) {
        // Toggle the negate meta state
        filter.meta.negate = !filter.meta.negate;

        saveState();
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
       * Removes the filter from the searchSource
       * @param {object} filter The filter to remove
       * @returns {void}
       */
      function removeFilter(invalidFilter) {
        // Remove the filter from the the scope $filters and map it back
        // to the original format to save in searchSource
        $scope.filters = _.filter($scope.filters, function (filter) {
          return filter !== invalidFilter;
        });

        saveState();
      }

      /**
       * Removes all filters
       * @returns {void}
       */
      function removeAll() {
        $scope.filters = [];
        saveState();
      }

      /**
       * Save the filters back to the searchSource
       * @returns {void}
       */
      function saveState() {
        $scope.state.filters = $scope.filters;
      }
    };
  };
});
