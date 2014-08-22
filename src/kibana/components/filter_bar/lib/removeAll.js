define(function (require) {
  return function ($scope) {
    /**
     * Removes all filters
     * @returns {void}
     */
    return function () {
      $scope.state.filters = [];
    };
  };
});
