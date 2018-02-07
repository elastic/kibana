
import _ from 'lodash';
import 'ui/paginated_table';
import fieldControlsHtml from '../field_controls.html';
import { dateScripts } from './date_scripts';
import { uiModules } from 'ui/modules';
import { toastNotifications } from 'ui/notify';
import template from './scripted_fields_table.html';
import { getSupportedScriptingLanguages, getDeprecatedScriptingLanguages } from 'ui/scripting_languages';
import { documentationLinks } from 'ui/documentation_links/documentation_links';

uiModules.get('apps/management')
  .directive('scriptedFieldsTable', function (kbnUrl, $filter, confirmModal) {
    const rowScopes = []; // track row scopes, so they can be destroyed as needed
    const filter = $filter('filter');

    return {
      restrict: 'E',
      template,
      scope: true,
      link: function ($scope) {

        const fieldCreatorPath = '/management/kibana/indices/{{ indexPattern }}/scriptedField';
        const fieldEditorPath = fieldCreatorPath + '/{{ fieldName }}';

        $scope.docLinks = documentationLinks.scriptedFields;
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
            toastNotifications.addSuccess({
              title: 'Created script fields',
              text: `Created ${fieldsAdded}`,
            });
          }

          if (conflictFields.length > 0) {
            toastNotifications.addWarning({
              title: `Didn't add duplicate fields`,
              text: `${conflictFields.length} fields: ${conflictFields.join(', ')}`,
            });
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
            confirmButtonText: 'Delete',
            onConfirm: () => { $scope.indexPattern.removeScriptedField(field.name); },
            title: `Delete scripted field '${field.name}'?`
          };
          confirmModal(`You can't recover scripted fields.`, confirmModalOptions);
        };

        function getLanguagesInUse() {
          const fields = $scope.indexPattern.getScriptedFields();
          return _.uniq(_.map(fields, 'lang'));
        }

        $scope.getDeprecatedLanguagesInUse = function () {
          return _.intersection(getLanguagesInUse(), getDeprecatedScriptingLanguages());
        };

        $scope.getUnsupportedLanguagesInUse = function () {
          return _.difference(getLanguagesInUse(), _.union(getSupportedScriptingLanguages(), getDeprecatedScriptingLanguages()));
        };
      }
    };
  });
