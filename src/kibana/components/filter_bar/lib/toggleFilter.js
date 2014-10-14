define(function (require) {
  var _ = require('lodash');
  var remapFilters = require('./remapFilters');
  return function ($scope) {
    /**
     * Toggles the filter between enabled/disabled.
     * @param {object} filter The filter to toggle
     & @param {boolean} force disabled true/false
     * @returns {void}
     */
    return function (filter, force) {
      // Toggle the disabled flag
      var disabled = _.isUndefined(force) ? !filter.disabled : force;
      filter.disabled = disabled;
      filter.filter.disabled = disabled;

      // Save the filters back to the searchSource
      $scope.state.filters = _.map($scope.filters, remapFilters);
    };
  };
});
