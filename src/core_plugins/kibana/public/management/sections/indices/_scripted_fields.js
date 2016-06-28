import _ from 'lodash';
import 'ui/paginated_table';
import popularityHtml from 'plugins/kibana/management/sections/indices/_field_popularity.html';
import controlsHtml from 'plugins/kibana/management/sections/indices/_field_controls.html';
import dateScripts from 'plugins/kibana/management/sections/indices/_date_scripts';
import uiModules from 'ui/modules';
import scriptedFieldsTemplate from 'plugins/kibana/management/sections/indices/_scripted_fields.html';

uiModules.get('apps/management')
.directive('scriptedFields', function (kbnUrl, Notifier, $filter) {
  const rowScopes = []; // track row scopes, so they can be destroyed as needed
  const filter = $filter('filter');

  const notify = new Notifier();

  return {
    restrict: 'E',
    template: scriptedFieldsTemplate,
    scope: true,
    link: function ($scope) {

      const fieldCreatorPath = '/management/kibana/indices/{{ indexPattern }}/scriptedField';
      const fieldEditorPath = fieldCreatorPath + '/{{ fieldName }}';

      $scope.perPage = 25;
      $scope.columns = [
        { title: 'name' },
        { title: 'script' },
        { title: 'format' },
        { title: 'controls', sortable: false }
      ];

      $scope.$watchMulti(['[]indexPattern.fields', 'fieldFilter'], refreshRows);

      function refreshRows() {
        _.invoke(rowScopes, '$destroy');
        rowScopes.length = 0;

        const fields = filter($scope.indexPattern.getScriptedFields(), $scope.fieldFilter);
        _.find($scope.fieldTypes, {index: 'scriptedFields'}).count = fields.length; // Update the tab count

        $scope.rows = fields.map(function (field) {
          const rowScope = $scope.$new();
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
      }

      $scope.addDateScripts = function () {
        const conflictFields = [];
        let fieldsAdded = 0;
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
        const params = {
          indexPattern: $scope.indexPattern.id
        };

        kbnUrl.change(fieldCreatorPath, params);
      };

      $scope.edit = function (field) {
        const params = {
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
