define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  angular.module('kibana/controllers')
    .controller('Kibana', function (courier, $scope, $rootScope) {
      $rootScope.dataSource = courier.createSource('search')
        .index('_all')
        .size(5);

      // this should be triggered from within the controlling application
      setTimeout(_.bindKey(courier, 'start'), 15);
    });

  angular.module('kibana/directives')
    .directive('courierTest', function () {
      return {
        restrict: 'E',
        scope: {
          type: '@'
        },
        template: '<strong style="float:left">{{count}} :&nbsp;</strong><pre>{{json}}</pre>',
        controller: function ($rootScope, $scope, courier) {
          $scope.count = 0;

          var source = $rootScope.dataSource.extend()
            .type($scope.type)
            .source({
              include: 'country'
            })
            .on('results', function (resp) {
              $scope.count ++;
              $scope.json = JSON.stringify(resp.hits, null, '  ');
            });

          courier.mapper.getFields($rootScope.dataSource, function (data) {
            $scope.json = data;
          });

          $scope.$watch('type', source.type);
        }
      };
    })
    .directive('courierDocTest', function () {
      return {
        restrict: 'E',
        scope: {
          id: '@',
          type: '@',
          index: '@'
        },
        template: '<strong style="float:left">{{count}} : <button ng-click="click()">reindex</button> :&nbsp;</strong><pre>{{json}}</pre>',
        controller: function (courier, $scope) {
          $scope.count = 0;

          var currentSource;
          $scope.click = function () {
            if (currentSource) {
              source.update(currentSource);
            }
          };

          var source = courier.createSource('doc')
            .id($scope.id)
            .type($scope.type)
            .index($scope.index)
            .on('results', function (doc) {
              currentSource = doc._source;
              $scope.count ++;
              $scope.json = JSON.stringify(doc, null, '  ');
            });
        }
      };
    });
});