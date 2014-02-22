define(function (require) {
  var angular = require('angular');

  angular
    .module('kibana/directives')
    .directive('configTest', function () {
      return {
        restrict: 'E',
        template: 'My favorite number is {{favoriteNum}} <button ng-click="click()">New Favorite</button>',
        controller: function ($scope, config) {
          config.bind($scope, 'favoriteNum', {
            default: 0
          });

          $scope.click = function () {
            $scope.favoriteNum++;
          };
        }
      };
    })
    .directive('courierTest', function () {
      return {
        restrict: 'E',
        scope: {
          type: '@'
        },
        template: '<strong style="float:left">{{count}} :&nbsp;</strong><pre>{{json}}</pre>',
        controller: function ($scope, courier) {
          $scope.count = 0;
          var source = courier.rootSearchSource.extend()
            .type($scope.type)
            .source({
              include: 'country'
            })
            .$scope($scope)
            .on('results', function (resp) {
              $scope.count ++;
              $scope.json = JSON.stringify(resp.hits, null, '  ');
            });
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
              source.doIndex(currentSource);
            }
          };
          var source = courier.createSource('doc')
            .id($scope.id)
            .type($scope.type)
            .index($scope.index)
            .$scope($scope)
            .on('results', function (doc) {
              currentSource = doc._source;
              $scope.count ++;
              $scope.json = JSON.stringify(doc, null, '  ');
            });
        }
      };
    });
});