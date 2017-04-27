import _ from 'lodash';
import 'ui/paginated_table';
import fieldControlsHtml from '../field_controls.html';
import { dateScripts } from './date_scripts';
import { getSupportedScriptingLangs } from 'ui/scripting_langs';
import { documentationLinks as docLinks } from 'ui/documentation_links/documentation_links';
import { uiModules } from 'ui/modules';
import template from './scripted_fields_table.html';

uiModules.get('apps/management')
.directive('scriptedFieldsTable', function (kbnUrl, Notifier, $filter, confirmModal) {
  const rowScopes = []; // track row scopes, so they can be destroyed as needed
  const filter = $filter('filter');

  const notify = new Notifier();

  return {
    restrict: 'E',
    template,
    scope: true,
    link: function ($scope) {

      const fieldCreatorPath = '/management/kibana/indices/{{ indexPattern }}/scriptedField';
      const fieldEditorPath = fieldCreatorPath + '/{{ fieldName }}';

      $scope.docLinks = docLinks;
      $scope.perPage = 25;
      $scope.columns = [
        { title: 'name' },
        { title: 'lang' },
        { title: 'script' },
        { title: 'format' },
        { title: 'controls', sortable: false }
      ];

      $scope.$watchMulti(['[]indexPattern.fields', 'fieldFilter', 'scriptedFieldLanguageFilter'], refreshRows);

      function refreshRows() {
        _.invoke(rowScopes, '$destroy');
        rowScopes.length = 0;

        const fields = filter($scope.indexPattern.getScriptedFields(), {
          name: $scope.fieldFilter,
          lang: $scope.scriptedFieldLanguageFilter
        });
        _.find($scope.editSections, { index: 'scriptedFields' }).count = fields.length; // Update the tab count

        $scope.rows = fields.map(function (field) {
          const rowScope = $scope.$new();
          rowScope.field = field;
          rowScopes.push(rowScope);

          return [
            _.escape(field.name),
            {
              markup: field.lang,
              attr: {
                'data-test-subj': 'scriptedFieldLang'
              }
            },
            _.escape(field.script),
            _.get($scope.indexPattern, ['fieldFormatMap', field.name, 'type', 'title']),
            {
              markup: fieldControlsHtml,
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
        const confirmModalOptions = {
          confirmButtonText: 'Delete field',
          onConfirm: () => { $scope.indexPattern.removeScriptedField(field.name); }
        };
        confirmModal(`Are you sure want to delete ${field.name}? This action is irreversible!`, confirmModalOptions);
      };

      $scope.getDeprecatedLanguagesInUse = function () {
        const fields = $scope.indexPattern.getScriptedFields();
        const langsInUse = _.uniq(_.map(fields, 'lang'));
        return _.difference(langsInUse, getSupportedScriptingLangs());
      };
    }
  };
});
