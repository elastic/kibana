define(function (require) {
  var _ = require('lodash');
  require('plugins/settings/sections/indices/_indexed_fields');
  require('plugins/settings/sections/indices/_scripted_fields');

  require('routes')
  .addResolves(/settings\/indices\/(.+)\/.+Field/, {
    indexPattern: function ($route, courier) {
      return courier.indexPatterns.get($route.current.params.id)
      .catch(courier.redirectWhenMissing('/settings/indices'));
    }
  })
  .when('/settings/indices/:id/createField', {
    template: require('text!plugins/settings/sections/indices/scripted_fields/index.html'),
  })
  .when('/settings/indices/:id/editField/:field', {
    template: require('text!plugins/settings/sections/indices/scripted_fields/index.html'),
  });

  require('modules').get('apps/settings')
  .controller('scriptedFieldsEdit', function ($scope, $route, Notifier) {
    var notify = new Notifier();

    $scope.action = ($route.current.params.field) ? 'Edit' : 'Create';
    $scope.indexPattern = $route.current.locals.indexPattern;
  });
});