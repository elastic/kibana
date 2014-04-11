define(function (require) {
  var kibana = require('kibana');

  require('css!./styles/index.css');
  require('services/root_search');

  var app = require('modules').get('app/examples');

  require('routes')
  .when('/examples', {
    templateUrl: 'kibana/apps/examples/index.html'
  });

  // main controller for the examples
  app.controller('examples', function ($scope, $location, courier) {
    $scope.examples = [
      'config',
      'mapper',
      'courier'
    ];

    $scope.makeActive = function (example) {
      $location.search({example: example});
      $scope.active = example;
      $scope.activeUrl = 'kibana/apps/examples/partials/' + example + '.html';
    };

    $scope.exampleLoaded = function () {
      if ($scope.active !== 'config') {
        courier.fetch();
      }
    };

    var initial = $location.search().example;
    if (initial) {
      $scope.makeActive(initial);
    }
  });

  // verify that config can be used, that it is stored, and that changes to it can be seen across tabs
  app.directive('configExample', function () {
    return {
      restrict: 'E',
      template: 'My favorite number is {{favoriteNum}} <button ng-click="click()">New Favorite</button>',
      controller: function ($scope, config) {
        // automatically write the value to elasticsearch when it is changed
        config.$bind($scope, 'favoriteNum', {
          default: 0
        });

        $scope.click = function () {
          $scope.favoriteNum++;
        };
      }
    };
  });

  // verify that a search can be created and it will automatically fetch results
  app.directive('courierExample', function () {
    return {
      restrict: 'E',
      scope: {
        type: '@'
      },
      template: '<strong style="float:left">{{count}} :&nbsp;</strong><pre>{{json}}</pre>',
      controller: function ($scope, courier, rootSearch) {
        $scope.count = 0;
        var source = rootSearch.extend()
          .type($scope.type)
          .source({
            include: 'country'
          });

        source.onResults().then(function onResults(resp) {
          $scope.count ++;
          $scope.json = JSON.stringify(resp.hits, null, '  ');
          return source.onResults().then(onResults);
        });
      }
    };
  });

  // verify that a doc can be fetched, and it will be updated across tabs
  app.directive('courierDocExample', function () {
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
          .index($scope.index);

        source.onResults().then(function onResults(doc) {
          currentSource = doc._source;
          $scope.count ++;
          $scope.json = JSON.stringify(doc, null, '  ');
          return source.onResults().then(onResults);
        });
      }
    };
  });

  // fetch the mapping for an index pattern
  app.directive('mappingExample', function () {
    return {
      restrict: 'E',
      scope: {
        type: '@',
        fields: '@'
      },
      template: 'Mappings:<br><div ng-repeat="(name,mapping) in mappedFields">{{name}} = {{mapping.type}}</div><hr>' +
        '<strong style="float:left">{{count}} :&nbsp;</strong><pre>{{json}}</pre>',
      controller: function ($rootScope, $scope, courier, rootSearch) {
        $scope.count = 0;
        $scope.mappedFields = {};

        var source = rootSearch.extend()
          .index('logstash-*')
          .type($scope.type)
          .source({
            include: 'geo'
          });


        source.onResults().then(function onResults(resp) {
          $scope.count ++;
          $scope.json = JSON.stringify(resp.hits, null, '  ');
          return source.onResults().then(onResults);
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