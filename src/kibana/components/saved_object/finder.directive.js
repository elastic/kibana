define(function (require) {

  var module = require('modules').get('kibana/saved_object');

  module.directive('findSavedObject', function () {
    return {
      restrict: 'E',
      scope: {
        service: '=',
        onChoose: '='
      },
      template: require('text!./_finder.html'),
      link: function ($scope, $el) {
        var $input = $el.find('input[ng-model=filter]');
        var currentFilter = $scope.filter;

        $scope.$watch('filter', function (filter) {
          // no need to re-run if we already have the results
          currentFilter = filter;
          $scope.service.find(filter)
          .then(function (hits) {
            // ensure that we don't display old results
            // as we can't really cancel requests
            if (currentFilter === filter) {
              $scope.hits = hits;
            }
            // $scope.$apply();
          });
        });
      }
    };
  });
});