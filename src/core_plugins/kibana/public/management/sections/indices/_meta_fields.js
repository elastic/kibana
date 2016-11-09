import _ from 'lodash';
import 'ui/paginated_table';
import popularityHtml from 'plugins/kibana/management/sections/indices/_field_popularity.html';
import controlsHtml from 'plugins/kibana/management/sections/indices/_field_controls.html';
import uiModules from 'ui/modules';
import metaFieldsTemplate from 'plugins/kibana/management/sections/indices/_meta_fields.html';

uiModules.get('apps/management')
.directive('metaFields', function (kbnUrl, Notifier, $filter) {
  const rowScopes = []; // track row scopes, so they can be destroyed as needed
  const filter = $filter('filter');

  const notify = new Notifier();

  return {
    restrict: 'E',
    template: metaFieldsTemplate,
    scope: true,
    link: function ($scope) {

      const fieldCreatorPath = '/management/kibana/indices/{{ indexPattern }}/metaField';
      const fieldEditorPath = fieldCreatorPath + '/{{ fieldName }}';

      $scope.perPage = 25;
      $scope.columns = [
        { title: 'name' },
        { title: 'format' },
        { title: 'controls', sortable: false }
      ];

      $scope.$watchMulti(['[]indexPattern.fields', 'fieldFilter'], refreshRows);

      function refreshRows() {
        _.invoke(rowScopes, '$destroy');
        rowScopes.length = 0;

        const fields = filter($scope.indexPattern.getMetaFields(), $scope.fieldFilter);
        _.find($scope.editSections, {index: 'metaFields'}).count = fields.length; // Update the tab count

        $scope.rows = fields.map(function (field) {
          const rowScope = $scope.$new();
          rowScope.field = field;
          rowScopes.push(rowScope);

          return [
            _.escape(field.name),
            _.get($scope.indexPattern, ['fieldFormatMap', field.name, 'type', 'title']),
            {
              markup: controlsHtml,
              scope: rowScope
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
        $scope.indexPattern.removeMetaField(field.name);
      };
    }
  };
});
