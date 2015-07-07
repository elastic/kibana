define(function (require) {
  var _ = require('lodash');
  require('components/paginated_table/paginated_table');

  require('modules').get('apps/settings')
  .directive('indexedFields', function () {
    var yesTemplate = '<i class="fa fa-check" aria-label="yes"></i>';
    var noTemplate = '';
    var nameHtml = require('plugins/kibana/settings/sections/indices/_field_name.html');
    var typeHtml = require('plugins/kibana/settings/sections/indices/_field_type.html');
    var controlsHtml = require('plugins/kibana/settings/sections/indices/_field_controls.html');

    return {
      restrict: 'E',
      template: require('plugins/kibana/settings/sections/indices/_indexed_fields.html'),
      scope: true,
      link: function ($scope) {
        var rowScopes = []; // track row scopes, so they can be destroyed as needed
        $scope.perPage = 25;
        $scope.columns = [
          { title: 'name' },
          { title: 'type' },
          { title: 'format' },
          { title: 'analyzed', info: 'Analyzed fields may require extra memory to visualize' },
          { title: 'indexed', info: 'Fields that are not indexed are unavailable for search' },
          { title: 'controls', sortable: false }
        ];

        $scope.$watchCollection('indexPattern.fields', function () {
          // clear and destroy row scopes
          _.invoke(rowScopes.splice(0), '$destroy');

          $scope.rows = $scope.indexPattern.getNonScriptedFields().map(function (field) {
            var childScope = _.assign($scope.$new(), { field: field });
            rowScopes.push(childScope);

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
                markup: controlsHtml,
                scope: childScope
              }
            ];
          });
        });
      }
    };
  });
});
