define(function (require) {
  var _ = require('lodash');

  require('routes')
  .when('/settings/indices/:id', {
    template: require('text!plugins/settings/sections/indices/_edit.html'),
    resolve: {
      indexPattern: function ($route, courier) {
        return courier.indexPatterns.get($route.current.params.id)
        .catch(courier.redirectWhenMissing('/settings/indices'));
      }
    }
  });

  require('modules').get('apps/settings')
  .controller('settingsIndicesEdit', function ($scope, $location, $route, config, courier, Notifier, Private) {
    var notify = new Notifier();
    var refreshKibanaIndex = Private(require('plugins/settings/sections/indices/_refresh_kibana_index'));

    $scope.indexPattern = $route.current.locals.indexPattern;
    var otherIds = _.without($route.current.locals.indexPatternIds, $scope.indexPattern.id);

    $scope.table = {
      by: 'name',
      reverse: false,
      page: 0,
      max: 35
    };

    $scope.conflictFields = _.filter($scope.indexPattern.fields, {type: 'conflict'});

    $scope.refreshFields = function () {
      $scope.indexPattern.refreshFields();
    };

    $scope.removePattern = function () {
      if ($scope.indexPattern.id === config.get('defaultIndex')) {
        config.delete('defaultIndex');
        if (otherIds.length) {
          config.set('defaultIndex', otherIds[0]);
        }
      }

      courier.indexPatterns.delete($scope.indexPattern)
      .then(refreshKibanaIndex)
      .then(function () {
        $location.url('/settings/indices');
      })
      .catch(notify.fatal);
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

    $scope.setIndexPatternsTimeField = function (field) {
      if (field.type !== 'date') {
        notify.error('That field is a ' + field.type + ' not a date.');
        return;
      }
      $scope.indexPattern.timeFieldName = field.name;
      return $scope.indexPattern.save();
    };
  });
});