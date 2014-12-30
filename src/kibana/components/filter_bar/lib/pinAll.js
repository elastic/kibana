define(function (require) {
  var _ = require('lodash');
  return function ($scope) {
    var pinFilter = require('components/filter_bar/lib/pinFilter')($scope);

    /**
     * Disables all filters
     * @params {boolean} force disable/enable all filters
     * @returns {void}
     */
    return function (force) {
      $scope.filters.forEach(function (filter) {
        pinFilter(filter, force);
      });

      $scope.state.filters = $scope.filters;
    };
  };
});
