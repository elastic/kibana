define(function (require) {
  var angular = require('angular');

  angular
    .module('kibana/controllers')
    .controller('examples', function ($scope, $location, courier) {
      $scope.examples = [
        'config',
        'mapper',
        'courier'
      ];

      $scope.makeActive = function (example) {
        $scope.active = example;
        $scope.activeUrl = 'kibana/apps/examples/partials/' + example + '.html';
      };

      $scope.exampleLoaded = function () {
        if ($scope.active !== 'config') {
          courier.fetch();
        }
      };
    });

  angular
    .module('kibana/directives')
    .directive('configTest', function () {
      return {
        restrict: 'E',
        template: 'My favorite number is {{favoriteNum}} <button ng-click="click()">New Favorite</button>',
        controller: function ($scope, config) {
          config.$bind($scope, 'favoriteNum', {
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
    })
    .directive('mappingTest', function () {
      return {
        restrict: 'E',
        scope: {
          type: '@',
          fields: '@'
        },
        template: 'Mappings:<br><div ng-repeat="(name,mapping) in mappedFields">{{name}} = {{mapping.type}}</div><hr>' +
          '<strong style="float:left">{{count}} :&nbsp;</strong><pre>{{json}}</pre>',
        controller: function ($rootScope, $scope, courier) {
          $scope.count = 0;
          $scope.mappedFields = {};

          var source = courier.rootSearchSource.extend()
            .index('logstash-*')
            .type($scope.type)
            .source({
              include: 'geo'
            })
            .$scope($scope)
            .on('results', function (resp) {
              $scope.count ++;
              $scope.json = JSON.stringify(resp.hits, null, '  ');
            });

          var fields = $scope.fields.split(',');

          fields.forEach(function (field) {
            courier._mapper.getFieldMapping(source, field, function (err, mapping) {
              $scope.$apply(function () {
                $scope.mappedFields[field] = mapping;
              });
            });
          });

          courier._mapper.getFields(source, function (err, response, status) {
            console.log(response);
          });
        }
      };
    });
});