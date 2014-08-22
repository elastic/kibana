define(function (require) {
  var _ = require('lodash');
  var remapFilters = require('./remapFilters');
  return function ($scope) {
    /**
     * Removes the filter from the searchSource
     * @param {object} filter The filter to remove
     * @returns {void}
     */
    return function (invalidFilter) {
      // Remove the filter from the the scope $filters and map it back
      // to the original format to save in searchSource
      $scope.state.filters = _($scope.filters)
        .filter(function (filter) {
          return filter.filter !== invalidFilter.filter;
        })
        .map(remapFilters)
        .value();
    };

  };
});
