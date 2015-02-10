define(function (require) {
  var _ = require('lodash');
  require('components/paginated_table/paginated_table');

  require('modules').get('apps/settings')
  .directive('scriptedFields', function (kbnUrl, Notifier, Promise) {
    var rowScopes = []; // track row scopes, so they can be destroyed as needed
    var checkboxHtml = require('text!plugins/settings/sections/indices/_scripted_field_checkbox.html');
    var controlsHtml = require('text!plugins/settings/sections/indices/_scripted_field_controls.html');

    var notify = new Notifier();

    return {
      restrict: 'E',
      template: require('text!plugins/settings/sections/indices/_scripted_fields.html'),
      scope: true,
      link: function ($scope, $el, attr) {
        var dateScripts = require('plugins/settings/sections/indices/_date_scripts');

        var fieldCreatorPath = '/settings/indices/{{ indexPattern }}/scriptedField';
        var fieldEditorPath = fieldCreatorPath + '/{{ fieldName }}';
        $scope.selectedScriptedFields = [];
        $scope.perPage = 25;

        $scope.columns = [{
          title: '',
          sortable: false
        }, {
          title: 'name'
        }, {
          title: 'script'
        }, {
          title: 'type'
        }, {
          title: 'controls',
          sortable: false
        }];

        $scope.$watch('indexPattern.fields', function () {
          _.invoke(rowScopes, '$destroy');
          rowScopes.length = 0;

          $scope.scriptedFields = $scope.indexPattern.getFields('scripted');
          $scope.rows = $scope.scriptedFields.map(function (field) {
            var rowScope = $scope.$new();
            var columns = [field.name, field.script, field.type];
            rowScope.field = field;
            rowScopes.push(rowScope);

            // prepend checkboxes
            columns.unshift({
              markup: checkboxHtml,
              scope: rowScope
            });

            // append control buttons
            columns.push({
              markup: controlsHtml,
              scope: rowScope
            });

            return columns;
          });
        });

        $scope.$watchCollection(function () {
          return $scope.scriptedFields.map(function (field) {
            return field.checked;
          });
        }, function() {
          $scope.selectedScriptedFields = $scope.scriptedFields.filter(function (field) {
            return field.checked;
          });
        });

        $scope.addDateScripts = function () {
          var conflictFields = [];
          var fieldsAdded = 0;
          _.each(dateScripts($scope.indexPattern), function (script, field) {
            try {
              $scope.indexPattern.addScriptedField(field, script, 'number');
              fieldsAdded++;
            } catch (e) {
              conflictFields.push(field);
            }
          });

          if (fieldsAdded > 0) {
            notify.info(fieldsAdded + ' script fields created');
          }

          if (conflictFields.length > 0) {
            notify.info('Not adding ' + conflictFields.length + ' duplicate fields: ' + conflictFields.join(', '));
          }
        };

        $scope.create = function () {
          var params = {
            indexPattern: $scope.indexPattern.id
          };

          kbnUrl.change(fieldCreatorPath, params);
        };

        $scope.select = function(field) {
          field.checked = !field.checked;
        };

        $scope.deleteAll = function () {
          Promise.map($scope.selectedScriptedFields, $scope.remove);
        };

        $scope.edit = function (field) {
          var params = {
            indexPattern: $scope.indexPattern.id,
            fieldName: field.name
          };

          kbnUrl.change(fieldEditorPath, params);
        };

        $scope.remove = function (field) {
          $scope.indexPattern.removeScriptedField(field.name);
        };
      }
    };
  });
});