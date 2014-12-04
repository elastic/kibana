define(function (require) {
  var _ = require('lodash');
  require('plugins/settings/sections/indices/_indexed_fields');
  require('plugins/settings/sections/indices/_scripted_fields');

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
  .controller('settingsIndicesEdit', function ($scope, $location, $route, config, courier, Notifier, Private, AppState) {

    var notify = new Notifier();
    var $state = $scope.state = new AppState();
    var popularityHtml = require('text!plugins/settings/sections/indices/_popularity.html');
    var refreshKibanaIndex = Private(require('plugins/settings/sections/indices/_refresh_kibana_index'));

    $scope.indexPattern = $route.current.locals.indexPattern;
    var otherIds = _.without($route.current.locals.indexPatternIds, $scope.indexPattern.id);

    var fieldTypes = Private(require('plugins/settings/sections/indices/_field_types'));
    $scope.$watch('indexPattern.fields', function () {
      $scope.fieldTypes = fieldTypes($scope.indexPattern);
    });

    $scope.changeTab = function (obj) {
      $state.tab = obj.index;
      $state.save();
    };

    $scope.$watch('state.tab', function (tab) {
      if (!tab) $scope.changeTab($scope.fieldTypes[0]);
    });

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