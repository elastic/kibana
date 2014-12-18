define(function (require) {
  var _ = require('lodash');
  return function ($scope) {
    /**
     * Inverts the nagate value on the filter
     * @param {object} filter The filter to toggle
     & @param {boolean} force disabled true/false
     * @returns {void}
     */
    return function (filter) {
      // Toggle the negate meta state
      filter.meta.negate = !filter.meta.negate;

      // Save the filters back to the searchSource
      $scope.state.filters = $scope.filters;
      return filter;
    };
  };
});
