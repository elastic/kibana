define(function (require) {
  var _ = require('lodash');
  return function ($scope) {
    /**
     * Pins the filter via enabled/disabled.
     * @param {object} filter The filter to pin
     & @param {boolean} force disabled true/false
     * @returns {void}
     */
    return function (filter, force) {
      // the pinned flag
      var pinned = _.isUndefined(force) ? !filter.meta.pinned : force;
      filter.meta.pinned = pinned;

      // Save the filters back to the searchSource
      $scope.state.filters = $scope.filters;
      return filter;
    };
  };
});
