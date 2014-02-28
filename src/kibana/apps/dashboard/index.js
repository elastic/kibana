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

    $scope.dashboard = {
      title: 'New Dashboard',
      panels: []
    };

    // Passed in the grid attr to the directive so we can access the directive's function from
    // the controller and view
    $scope.gridControl = {};

    $scope.input = {
      search: ''
    };

    $scope.$watch('configurable.input.search', function (newVal) {
      dashboardSearch(newVal);
    });

    var init = function () {
      $scope.configurable = {
        dashboard: $scope.dashboard,
        load: $scope.load,
        input: {
          search: $scope.input.search
        }
      };
    };

    var dashboardSearch = function (query) {
      var search;

      if (_.isString(query) && query.length > 0) {

        query = {match: {title: {query: query, type: 'phrase_prefix'}}};
      } else {
        query = {match_all: {}};
      }

      search = courier.createSource('search')
        .index(configFile.kibanaIndex)
        .type('dashboard')
        .size(20)
        .query(query)
        .$scope($scope)
        .inherits(courier.rootSearchSource)
        .on('results', function (res) {
          $scope.configurable.searchResults = res.hits.hits;
        });

      search.fetch();

    };

    var setConfigTemplate = function (template) {
      // Close if already open
      if ($scope.configTemplate === template) {
        delete $scope.configTemplate;
        return;
      } else {
        $scope.configTemplate = template;
      }
    };

    $scope.openSave = function () {
      setConfigTemplate(require('text!./partials/save_dashboard.html'));

      $scope.configSubmit = function () {
        $scope.save($scope.dashboard.title);
      };
    };

    $scope.openLoad = function () {
      setConfigTemplate(require('text!./partials/load_dashboard.html'));

      if ($scope.configTemplate) dashboardSearch($scope.configurable.input.search);
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

    init();
    $scope.$broadcast('application.load');

  });
});