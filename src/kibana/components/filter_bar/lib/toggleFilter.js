define(function (require) {
  var _ = require('lodash');
  return function ($scope) {
    /**
     * Toggles the filter between enabled/disabled.
     * @param {object} filter The filter to toggle
     & @param {boolean} force disabled true/false
     * @returns {void}
     */
    return function (filter, force) {
      // Toggle the disabled flag
      var disabled = _.isUndefined(force) ? !filter.meta.disabled : force;
      filter.meta.disabled = disabled;

      // Save the filters back to the searchSource
      $scope.state.filters = $scope.filters;
      return filter;
    };
  };
});
