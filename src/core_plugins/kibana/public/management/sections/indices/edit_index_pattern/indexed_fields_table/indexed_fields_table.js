import _ from 'lodash';
import 'ui/paginated_table';
import fieldNameHtml from './field_name.html';
import fieldTypeHtml from './field_type.html';
import fieldControlsHtml from '../field_controls.html';
import { uiModules } from 'ui/modules';
import { FieldWildcardProvider } from 'ui/field_wildcard';
import template from './indexed_fields_table.html';

uiModules.get('apps/management')
.directive('indexedFieldsTable', function (Private, $filter) {
  const yesTemplate = '<i class="fa fa-check" aria-label="yes"></i>';
  const noTemplate = '';
  const filter = $filter('filter');
  const { fieldWildcardMatcher } = Private(FieldWildcardProvider);

  return {
    restrict: 'E',
    template,
    scope: true,
    link: function ($scope) {
      const rowScopes = []; // track row scopes, so they can be destroyed as needed
      $scope.perPage = 25;
      $scope.columns = [
        { title: 'name' },
        { title: 'type' },
        { title: 'format' },
        { title: 'searchable', info: 'These fields can be used in the filter bar' },
        { title: 'aggregatable' , info: 'These fields can be used in visualization aggregations' },
        { title: 'excluded', info: 'Fields that are excluded from _source when it is fetched' },
        { title: 'controls', sortable: false }
      ];

      $scope.$watchMulti(['[]indexPattern.fields', 'fieldFilter', 'indexedFieldTypeFilter'], refreshRows);

      function refreshRows() {
        // clear and destroy row scopes
        _.invoke(rowScopes.splice(0), '$destroy');
        const fields = filter($scope.indexPattern.getNonScriptedFields(), {
          name: $scope.fieldFilter,
          type: $scope.indexedFieldTypeFilter
        });
        const sourceFilters = $scope.indexPattern.sourceFilters && $scope.indexPattern.sourceFilters.map(f => f.value) || [];
        const fieldWildcardMatch = fieldWildcardMatcher(sourceFilters);
        _.find($scope.editSections, { index: 'indexedFields' }).count = fields.length; // Update the tab count

        $scope.rows = fields.map(function (field) {
          const childScope = _.assign($scope.$new(), { field: field });
          rowScopes.push(childScope);

          const excluded = fieldWildcardMatch(field.name);

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
              value: field.type,
              attr: {
                'data-test-subj': 'indexedFieldType'
              }
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
              markup: excluded ? yesTemplate : noTemplate,
              value: excluded
            },
            {
              markup: fieldControlsHtml,
              scope: childScope
            }
          ];
        });
      }
    }
  };
});
