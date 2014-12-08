define(function (require) {
  var _ = require('lodash');

  require('plugins/settings/sections/indices/_indexed_fields');
  require('plugins/settings/sections/indices/_scripted_fields');


  require('routes')
  .addResolves(/settings\/indices\/(.+)\/scriptedField/, {
    indexPattern: function ($route, courier) {
      return courier.indexPatterns.get($route.current.params.id)
      .catch(courier.redirectWhenMissing('/settings/indices'));
    }
  })
  .when('/settings/indices/:id/scriptedField', {
    template: require('text!plugins/settings/sections/indices/scripted_fields/index.html'),
  })
  .when('/settings/indices/:id/scriptedField/:field', {
    template: require('text!plugins/settings/sections/indices/scripted_fields/index.html'),
  });

  require('modules').get('apps/settings')
  .controller('scriptedFieldsEdit', function ($scope, $route, $window, Notifier, Private, kbnUrl) {
    var fieldTypes = Private(require('components/index_patterns/_field_types'));
    var indexPatternPath = '/settings/indices/{{ indexPattern }}?_a=(tab:scriptedFields)';
    var notify = new Notifier();
    var createMode = (!$route.current.params.field);

    $scope.indexPattern = $route.current.locals.indexPattern;
    $scope.fieldTypes = fieldTypes;

    if (createMode) {
      $scope.action = 'Create';
    } else {
      var scriptName = $route.current.params.field;
      $scope.action = 'Edit';
      $scope.scriptedField = _.find($scope.indexPattern.fields, {
        name: scriptName,
        scripted: true
      });
    }

    $scope.goBack = function () {
      kbnUrl.change(indexPatternPath, {
        indexPattern: $scope.indexPattern.id
      });
    };

    $scope.submit = function () {
      var field = $scope.scriptedField;
      try {
        if (createMode) {
          $scope.indexPattern.addScriptedField(field.name, field.script, field.type);
        } else {
          $scope.indexPattern.save();
        }
        notify.info('Scripted field \'' + $scope.scriptedField.name + '\' successfully saved');
        $scope.goBack();
      } catch (e) {
        notify.error(e.message);
      }
    };

    $scope.$watch('scriptedField.name', function (name) {
      checkConflict(name);
    });

    function checkConflict(name) {
      var match = _.find($scope.indexPattern.getFields(), {
        name: name
      });

      if (match) {
        $scope.namingConflict = true;
      } else {
        $scope.namingConflict = false;
      }
    }
  });
});