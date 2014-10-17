define(function (require) {
  var _ = require('lodash');
  return function ($scope) {

    var remapFilters = require('components/filter_bar/lib/remapFilters');
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

      $scope.state.filters = _.map($scope.filters, remapFilters);
    };
  };
});
