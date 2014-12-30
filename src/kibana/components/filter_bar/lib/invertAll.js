define(function (require) {
  return function ($scope) {
    var invertFilter = require('components/filter_bar/lib/invertFilter')($scope);

    /**
     * Removes all filters
     * @returns {void}
     */
    return function () {
      $scope.filters.forEach(function (filter) {
        invertFilter(filter);
      });

      $scope.state.filters = $scope.filters;
    };
  };
});
