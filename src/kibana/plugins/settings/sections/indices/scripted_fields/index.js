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
  .controller('scriptedFieldsEdit', function ($scope, $route, $window, Notifier) {
    var notify = new Notifier();
    var createMode = (!$route.current.params.field);
    $scope.indexPattern = $route.current.locals.indexPattern;

    if (createMode) {
      $scope.action = 'Create';
    } else {
      $scope.action = 'Edit';
      // TODO: fetch matching scriptedField
    }

    $scope.cancel = function () {
      $window.history.back();
    };

    $scope.submit = function () {
      if (createMode) {
        $scope.indexPattern.addScriptedField($scope.scriptedField.name, $scope.scriptedField.script);
        // redirect URL to update the app state, but not break the back button
        kbnUrl.redirect('/settings/indices/{id}/editField/{field}', {
          id: $scope.indexPattern.id,
          field: $scope.scriptedField.name
        });
      } else {
        $scope.indexPattern.save();
      }

      notify.info($scope.scriptedField.name + ' successfully saved');
    };

    $scope.$watch('scriptedField.name', function (name) {
      checkConflict(name);
    });

    function checkConflict(name) {
      var match = $scope.indexPattern.fields.byName[name];
      if (match) {
        $scope.namingConflict = true;
      } else {
        $scope.namingConflict = false;
      }
    }
  });
});