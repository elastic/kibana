define(function (require) {
  var angular = require('angular');

  angular.module('kibana/controllers')
    .controller('Kibana', function (courier, $scope, $rootScope) {
      $rootScope.dataSource = courier.createSource('search')
        .index('_all')
        .size(5);

      // this should be triggered from within the controlling application
      setTimeout(courier.start, 15);
    });

  angular.module('kibana/directives')
    .directive('courierTest', function () {
      return {
        restrict: 'E',
        scope: {
          type: '@'
        },
        controller: function ($rootScope, $scope) {
          var source = $rootScope.dataSource.extend()
            .type($scope.type)
            .source({
              include: 'country'
            })
            .on('results', function (resp) {
              $scope.json = JSON.stringify(resp.hits, null, '  ');
            });

          $scope.$watch('type', source.type);
        },
        template: '<pre>{{json}}</pre>'
      };
    });
});