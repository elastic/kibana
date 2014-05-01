define(function (require) {
  var module = require('modules').get('settings/controllers');
  var _ = require('lodash');

  require('courier/courier');

  require('../sections').push({
    order: 1,
    name: 'indices',
    display: 'Indices',
    url: '#/settings/indices',
    template: require('text!../partials/indices.html'),
    resolve: {
      indexPattern: function ($route, courier) {
        return courier.indexPatterns.get($route.current.params.id);
      },
      indexPatternIds: function (courier) {
        return courier.indexPatterns.getIds();
      }
    }
  });

  module.controller('indexSettings', function ($scope, courier, Notifier, $route, $location, es, config) {
    var notify = new Notifier({
      location: 'Index Settings'
    });

    $scope.indexPattern = $route.current.locals.indexPattern;
    $scope.indexPatternIds = $route.current.locals.indexPatternIds;

    $scope.defaultIndex = config.get('defaultIndex');
    $scope.$on('change:config.defaultIndex', function () {
      $scope.defaultIndex = config.get('defaultIndex');
    });

    $scope.table = {
      by: 'name',
      reverse: false,
      page: 0,
      max: 20
    };

    $scope.refreshFields = function () {
      $scope.indexPattern.refreshFields();
    };

    $scope.removePattern = function () {
      courier.indexPatterns.delete($scope.indexPattern)
      .then(refreshKibanaIndex)
      .then(function () {
        $location.path('/settings/indices');
      })
      .catch(notify.fatal);
    };

    $scope.create = function () {
      $scope.indexPattern.id = $scope.indexPattern.title;

      // refresh the fields, to verify that the
      $scope.indexPattern.refreshFields()
      .then(refreshKibanaIndex)
      .then(function () {
        $location.path('/settings/indices/' + $scope.indexPattern.id);
      })
      .catch(function (err) {
        if (err.status >= 400) notify.error('Could not locate any indices matching that pattern. Please add the index to Elasticsearch');
        else notify.fatal(err);
      });
    };

    $scope.setDefaultPattern = function () {
      config.set('defaultIndex', $scope.indexPattern.id);
    };

    $scope.setFieldSort = function (by) {
      if ($scope.table.by === by) {
        $scope.table.reverse = !$scope.table.reverse;
      } else {
        $scope.table.by = by;
      }
    };

    $scope.sortClass = function (column) {
      if ($scope.table.by !== column) return;
      return $scope.table.reverse ? ['fa', 'fa-sort-asc'] : ['fa', 'fa-sort-desc'];
    };

    $scope.tablePages = function () {
      if (!$scope.indexPattern.fields) return 0;
      return Math.ceil($scope.indexPattern.fields.length / $scope.table.max);
    };

    var refreshKibanaIndex = function () {
      return es.indices.refresh({
        index: config.file.kibanaIndex
      });
    };

    $scope.$emit('application.load');
  });
});