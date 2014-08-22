define(function (require) {
  var _ = require('lodash');
  var remapFilters = require('./remapFilters');
  return function ($scope) {
    /**
     * Toggles the filter between enabled/disabled.
     * @param {object} filter The filter to toggle
     * @returns {void}
     */
    return function (filter) {
      // Toggle the disabled flag
      var disabled = !filter.disabled;
      filter.disabled = disabled;
      filter.filter.disabled = disabled;

      // Save the filters back to the searchSource
      $scope.state.filters = _.map($scope.filters, remapFilters);
    };
  };
});
