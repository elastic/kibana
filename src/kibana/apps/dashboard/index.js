define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');
  var configFile = require('../../../config');

  require('css!./styles/main.css');
  require('directives/config');
  require('apps/dashboard/directives/grid');
  require('apps/dashboard/directives/panel');

  //require('apps/dashboard/services/dashboard');



  var app = angular.module('app/dashboard');

  app.controller('dashboard', function ($scope, courier) {

    $scope.$broadcast('application.load');

    // Passed in the grid attr to the directive so we can access the directive's function from
    // the controller and view
    $scope.gridControl = {};

    $scope.openSave = function () {
      var template = 'kibana/apps/dashboard/partials/save_dashboard.html';

      // Close if already open
      $scope.configTemplate = $scope.configTemplate === template ? undefined : template;

      $scope.configSubmit = function () {
        $scope.save($scope.dashboard.title);
      };
    };

    $scope.openLoad = function () {
      var template = 'kibana/apps/dashboard/partials/load_dashboard.html';

      // Close if already open
      $scope.configTemplate = $scope.configTemplate === template ? undefined : template;

      var search = courier.createSource('search')
        .index(configFile.kibanaIndex)
        .type('dashboard')
        .size(20)
        .$scope($scope)
        .inherits(courier.rootSearchSource)
        .on('results', function (res) {
          console.log(res.hits);
          $scope.configurable.searchResults = res.hits.hits;
        });

      // TODO: Find out why results is fired twice
      search.fetch();
    };

    $scope.save = function (title) {
      var doc = courier.createSource('doc')
        .index(configFile.kibanaIndex)
        .type('dashboard')
        .id(title);

      doc.doIndex({title: title, panels: $scope.gridControl.serializeGrid()}, function (err) {
        if (_.isUndefined(err)) { return; }
        else { throw new Error(err); }
      });
    };

    $scope.load = function (schema) {
      _.assign($scope.dashboard, schema);

      $scope.gridControl.clearGrid();
      $scope.gridControl.unserializeGrid($scope.dashboard.panels);
    };

    $scope.dashboard = {
      title: 'Logstash Dashboard',
      panels: [
        {
          col: 1,
          row: 1,
          size_x: 5,
          size_y: 2,
          params: { type: 'line' }
        },
        {
          col: 6,
          row: 1,
          size_x: 4,
          size_y: 2,
          params: { type: 'bar' }
        },
        {
          col: 10,
          row: 1,
          size_x: 3,
          size_y: 1,
          params: { type: 'table' }
        },
        {
          col: 10,
          row: 2,
          size_x: 3,
          size_y: 1,
          params: { type: 'pie' }
        },
        {
          col: 1,
          row: 3,
          size_x: 3,
          size_y: 1,
          params: { type: 'scatter' }
        },
        {
          col: 4,
          row: 3,
          size_x: 3,
          size_y: 1,
          params: { type: 'map' }
        },
        {
          col: 7,
          row: 3,
          size_x: 3,
          size_y: 1,
          params: { type: 'sparkline' }
        },
        {
          col: 10,
          row: 3,
          size_x: 3,
          size_y: 1,
          params: { type: 'heatmap' }
        }
      ]
    };

    $scope.configurable = {
      dashboard: $scope.dashboard,
      load: $scope.load
    };

  });
});