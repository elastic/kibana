define(function (require) {
  var _ = require('lodash');
  require('components/paginated_table/paginated_table');

  require('modules').get('apps/settings')
  .directive('scriptedFields', function (kbnUrl, Notifier) {
    var rowScopes = []; // track row scopes, so they can be destroyed as needed
    var controlsHtml = require('text!plugins/settings/sections/indices/_field_controls.html');

    var notify = new Notifier();

    return {
      restrict: 'E',
      template: require('text!plugins/settings/sections/indices/_scripted_fields.html'),
      scope: true,
      link: function ($scope) {
        var dateScripts = require('plugins/settings/sections/indices/_date_scripts');

        var fieldCreatorPath = '/settings/indices/{{ indexPattern }}/scriptedField';
        var fieldEditorPath = fieldCreatorPath + '/{{ fieldName }}';

        $scope.perPage = 25;
        $scope.columns = [
          { title: 'name' },
          { title: 'script' },
          { title: 'format' },
          { title: 'controls', sortable: false }
        ];

        $scope.$watch('indexPattern.fields', function () {
          _.invoke(rowScopes, '$destroy');
          rowScopes.length = 0;

          $scope.rows = $scope.indexPattern.getScriptedFields().map(function (field) {
            var rowScope = $scope.$new();
            rowScope.field = field;
            rowScopes.push(rowScope);

            return [
              _.escape(field.name),
              _.escape(field.script),
              _.get($scope.indexPattern, ['fieldFormatMap', field.name, 'type', 'title']),
              {
                markup: controlsHtml,
                scope: rowScope
              }
            ];
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
