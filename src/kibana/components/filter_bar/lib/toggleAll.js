define(function (require) {
  var _ = require('lodash');
  return function ($scope) {
    var toggleFilter = require('components/filter_bar/lib/toggleFilter')($scope);

    /**
     * Disables all filters
     * @params {boolean} force disable/enable all filters
     * @returns {void}
     */
    return function (force) {
      $scope.filters.forEach(function (filter) {
        toggleFilter(filter, force);
      });

      $scope.state.filters = $scope.filters;
    };
  };
});
