import _ from 'lodash';
import 'ui/paginated_table';
import fieldNameHtml from '../indexed_fields_table/field_name.html';
import fieldTypeHtml from '../indexed_fields_table/field_type.html';
import fieldControlsHtml from '../field_controls.html';
import { uiModules } from 'ui/modules';
import template from './meta_fields_table.html';

uiModules.get('apps/management')
.directive('metaFieldsTable', function (kbnUrl, Notifier, $filter, confirmModal) {
  const yesTemplate = '<i class="fa fa-check" aria-label="yes"></i>';
  const noTemplate = '';
  const rowScopes = []; // track row scopes, so they can be destroyed as needed
  const filter = $filter('filter');

  return {
    restrict: 'E',
    template,
    scope: true,
    link: function ($scope) {

      const fieldCreatorPath = '/management/kibana/indices/{{ indexPattern }}/metaField';
      const fieldEditorPath = fieldCreatorPath + '/{{ fieldName }}';

      $scope.perPage = 25;
      $scope.columns = [
        { title: 'name' },
        { title: 'type' },
        { title: 'format' },
        { title: 'searchable', info: 'These fields can be used in the filter bar' },
        { title: 'aggregatable' , info: 'These fields can be used in visualization aggregations' },
        { title: 'controls', sortable: false }
      ];

      $scope.$watchMulti(['[]indexPattern.fields', 'fieldFilter'], refreshRows);

      function refreshRows() {
        _.invoke(rowScopes, '$destroy');
        rowScopes.length = 0;

        const fields = filter($scope.indexPattern.getMetaFields(), { name: $scope.fieldFilter });
        _.find($scope.editSections, { index: 'metaFields' }).count = fields.length; // Update the tab count
        $scope.rows = fields.map(function (field) {
          const childScope = _.assign($scope.$new(), { field: field });
          rowScopes.push(childScope);

          return [
            {
              markup: fieldNameHtml,
              scope: childScope,
              value: field.displayName,
              attr: {
                'data-test-subj': 'indexedFieldName'
              }
            },
            {
              markup: fieldTypeHtml,
              scope: childScope,
              value: field.type
            },
            _.get($scope.indexPattern, ['fieldFormatMap', field.name, 'type', 'title']),
            {
              markup: field.searchable ? yesTemplate : noTemplate,
              value: field.searchable
            },
            {
              markup: field.aggregatable ? yesTemplate : noTemplate,
              value: field.aggregatable
            },
            {
              markup: fieldControlsHtml,
              scope: childScope
            }
          ];
        });
      }

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
          onConfirm: () => { $scope.indexPattern.removeMetaField(field.name); }
        };
        confirmModal(`Are you sure want to delete ${field.name}? This action is irreversible!`, confirmModalOptions);
      };
    }
  };
});
