define(function (require) {
  require('components/field_editor/field_editor');
  require('plugins/settings/sections/indices/_index_header');

  require('routes')
  .when('/settings/indices/:indexPatternId/field/:fieldName', { mode: 'edit' })
  .when('/settings/indices/:indexPatternId/create-field/', { mode: 'create' })
  .defaults(/settings\/indices\/[^\/]+\/(field|create-field)(\/|$)/, {
    template: require('text!plugins/settings/sections/indices/_field_editor.html'),
    resolve: {
      indexPattern: function ($route, courier) {
        return courier.indexPatterns.get($route.current.params.indexPatternId)
        .catch(courier.redirectWhenMissing('/settings/indices'));
      }
    },
    controllerAs: 'fieldSettings',
    controller: function FieldEditorPageController($route, Private, Notifier, kbnUrl, docTitle) {
      var Field = Private(require('components/index_patterns/_field'));
      var notify = new Notifier({ location: 'Field Editor' });


      this.mode = $route.current.mode;
      this.indexPattern = $route.current.locals.indexPattern;


      if (this.mode === 'edit') {
        var fieldName = $route.current.params.fieldName;
        this.field = this.indexPattern.fields.byName[fieldName];

        if (!this.field) {
          notify.error(this.indexPattern + ' does not have a "' + fieldName + '" field.');
          kbnUrl.redirect(this.indexPattern.editRoute);
          return;
        }
      }
      else if (this.mode === 'create') {
        this.field = new Field(this.indexPattern, {
          scripted: true,
          type: 'number'
        });
      } else {
        throw new Error('unknown fieldEditorPage mode ' + this.mode);
      }

      docTitle.change([this.field.name || 'New Scripted Field', this.indexPattern.id]);
      this.goBack = function () {
        kbnUrl.change(this.indexPattern.editUrl);
      };
    }
  });


  // require('modules').get('apps/settings')
  // .controller('scriptedFieldsEdit', function ($scope, $route, $window, Notifier, Private) {
  //   var fieldTypes = Private(require('components/index_patterns/_field_types'));
  //   var notify = new Notifier();
  //   var createMode = (!$route.current.params.field);

  //   $scope.indexPattern = $route.current.locals.indexPattern;
  //   $scope.fieldTypes = fieldTypes;

  //   if (createMode) {
  //     $scope.action = 'Create';
  //   } else {
  //     var scriptName = $route.current.params.field;
  //     $scope.action = 'Edit';
  //     $scope.scriptedField = _.find($scope.indexPattern.fields, {
  //       name: scriptName,
  //       scripted: true
  //     });
  //   }

  //   $scope.submit = function () {
  //     var field = _.defaults($scope.scriptedField, {
  //       type: 'number',
  //       lang: 'expression'
  //     });

  //     try {
  //       if (createMode) {
  //         $scope.indexPattern.addScriptedField(field.name, field.script, field.type, field.lang);
  //       } else {
  //         $scope.indexPattern.save();
  //       }
  //       notify.info('Scripted field \'' + $scope.scriptedField.name + '\' successfully saved');
  //       $scope.goBack();
  //     } catch (e) {
  //       notify.error(e.message);
  //     }
  //   };

  //   $scope.$watch('scriptedField.name', function (name) {
  //     checkConflict(name);
  //   });

  //   function checkConflict(name) {
  //     var match = _.find($scope.indexPattern.getFields(), {
  //       name: name
  //     });

  //     if (match) {
  //       $scope.namingConflict = true;
  //     } else {
  //       $scope.namingConflict = false;
  //     }
  //   }
  // });

});
