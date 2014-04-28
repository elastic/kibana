define(function (require) {
  var module = require('modules').get('settings/controllers');

  module.controller('indexSettings', function ($scope, courier, Notifier, $route, $location, es, config, indexPatterns) {
    var notify = new Notifier({
      location: 'Index Settings'
    });

    var init = function () {
      $scope.getPatterns();
      $scope.indices = {
        id: $route.current.params.id,
        table: {
          by: 'field',
          reverse: false,
          page: 0,
          max: 20
        },
        default: config.get('defaultIndex')
      };

      if (!!$scope.indices.id) {
        loadPattern($scope.indices.id);
      }
    };

    var loadPattern = function (pattern) {
      return indexPatterns.getFields(pattern)
      .then(function (fields) {
        $scope.indices.mapping = fields;
      })
      .catch(function () {
        $location.path('/settings/indices');
      });
    };

    // TODO: Resolve this in the routes, otherwise the warning will show for a moment;
    $scope.getPatterns = function (pattern) {
      return indexPatterns.getIds()
      .then(function (ids) {
        $scope.indices.patterns = ids;
      });
    };

    $scope.refreshFields = function (pattern) {
      return indexPatterns.delete(pattern)
      .then(function () {
        return indexPatterns.create(pattern);
      });
    };

    $scope.removePattern = function (pattern) {
      indexPatterns.delete(pattern)
      .then(function () {
        $location.path('/settings/indices');
      })
      .catch(function (err) {
        $location.path('/settings/indices');
      });
    };

    $scope.addPattern = function (pattern) {
      indexPatterns.create(pattern)
      .then(function () {
        $location.path('/settings/indices/' + pattern);
      })
      .catch(function (err) {
        if (err.status >= 400) {
          notify.error('Could not locate any indices matching that pattern. Please add the index to Elasticsearch');
        }
      });
    };

    $scope.setDefaultPattern = function (pattern) {
      config.set('defaultIndex', pattern)
      .then(function () {
        $scope.indices.default = pattern;
      });
    };

    $scope.setFieldSort = function (by) {
      if ($scope.indices.table.by === by) {
        $scope.indices.table.reverse = !$scope.indices.table.reverse;
      } else {
        $scope.indices.table.by = by;
      }
    };

    $scope.sortClass = function (column) {
      if ($scope.indices.table.by !== column) return;
      return $scope.indices.table.reverse ? ['fa', 'fa-sort-asc'] : ['fa', 'fa-sort-desc'];
    };

    $scope.tablePages = function () {
      if (!$scope.indices.mapping) return 0;
      return Math.ceil($scope.indices.mapping.length / $scope.indices.table.max);
    };

    init();

    $scope.$emit('application.load');
  });
});