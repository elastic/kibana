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
          type: '@',
          fields: '@'
        },
        template: 'Mappings:<br><div ng-repeat="(name,mapping) in mappedFields">{{name}} = {{mapping.type}}</div><hr>' +
          '<strong style="float:left">{{count}} :&nbsp;</strong><pre>{{json}}</pre>',
        controller: function ($rootScope, $scope, courier) {
          $scope.count = 0;
          $scope.mappedFields = {};

          var source = $rootScope.dataSource.extend()
            .index('logstash-2014.02.14')
            .type($scope.type)
            .source({
              include: 'country'
            })
            .on('results', function (resp) {
              $scope.count ++;
              $scope.json = JSON.stringify(resp.hits, null, '  ');
            });

          var fields = $scope.fields.split(',');


          _.each(fields, function (field) {
            courier._mapper.getFieldMapping(source, field, function (err, mapping) {
              $scope.mappedFields[field] = mapping;
            });
          });


          courier._mapper.getFields(source, function (err, response, status) {
            console.log(response);
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
        template: '<strong style="float:left">{{count}} : <button ng-click="click()">reindex</button> :&nbsp;</strong>' +
          '<pre>{{json}} BEER</pre>',
        controller: function (courier, $scope) {
          $scope.count = 0;

          console.log(courier);

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