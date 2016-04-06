import _ from 'lodash';
import 'ui/paginated_table';
import nameHtml from 'plugins/kibana/settings/sections/indices/_field_name.html';
import typeHtml from 'plugins/kibana/settings/sections/indices/_field_type.html';
import controlsHtml from 'plugins/kibana/settings/sections/indices/_field_controls.html';
import uiModules from 'ui/modules';
import indexedFieldsTemplate from 'plugins/kibana/settings/sections/indices/_indexed_fields.html';
import { fieldWildcardMatcher } from 'ui/field_wildcard';

uiModules.get('apps/settings')
.directive('settingsIndicesIndexedFields', function ($filter) {
  const yesTemplate = '<i class="fa fa-check" aria-label="yes"></i>';
  const noTemplate = '';
  const filter = $filter('filter');

  return {
    restrict: 'E',
    template: indexedFieldsTemplate,
    scope: true,
    link: function ($scope) {
      const rowScopes = []; // track row scopes, so they can be destroyed as needed
      $scope.perPage = 25;
      $scope.columns = [
        { title: 'name' },
        { title: 'type' },
        { title: 'format' },
        { title: 'analyzed', info: 'Analyzed fields may require extra memory to visualize' },
        { title: 'indexed', info: 'Fields that are not indexed are unavailable for search' },
        { title: 'exclude', info: 'Fields that are excluded from _source when it is fetched' },
        { title: 'controls', sortable: false }
      ];

      $scope.$watchMulti(['[]indexPattern.fields', 'fieldFilter'], refreshRows);

      function refreshRows() {
        // clear and destroy row scopes
        _.invoke(rowScopes.splice(0), '$destroy');
        const fields = filter($scope.indexPattern.getNonScriptedFields(), $scope.fieldFilter);
        const fieldWildcardMatch = fieldWildcardMatcher($scope.indexPattern.fieldFilters.map(f => f.value));

        $scope.rows = fields.map(function (field) {
          const childScope = _.assign($scope.$new(), { field: field });
          rowScopes.push(childScope);

          const excluded = field.exclude || fieldWildcardMatch(field.name);

          return [
            {
              markup: nameHtml,
              scope: childScope,
              value: field.displayName
            },
            {
              markup: typeHtml,
              scope: childScope,
              value: field.type
            },
            _.get($scope.indexPattern, ['fieldFormatMap', field.name, 'type', 'title']),
            {
              markup: field.analyzed ? yesTemplate : noTemplate,
              value: field.analyzed
            },
            {
              markup: field.indexed ? yesTemplate : noTemplate,
              value: field.indexed
            },
            {
              markup: excluded ? yesTemplate : noTemplate,
              value: excluded
            },
            {
              markup: controlsHtml,
              scope: childScope
            }
          ];
        });
      }
    }
  };
});
