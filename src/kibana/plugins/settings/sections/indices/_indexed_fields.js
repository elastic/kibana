define(function (require) {
  var _ = require('lodash');
  require('components/paginated_table/paginated_table');

  require('modules').get('apps/settings')
  .directive('indexedFields', function (Private) {
    var setupIndexedField = Private(require('plugins/settings/sections/indices/_indexed_field'));

    var nameHtml = require('text!plugins/settings/sections/indices/_field_name.html');
    var typeHtml = require('text!plugins/settings/sections/indices/_field_type.html');
    var formatHtml = require('text!plugins/settings/sections/indices/_field_format.html');
    var popularityHtml = require('text!plugins/settings/sections/indices/_field_popularity.html');

    return {
      restrict: 'E',
      template: require('text!plugins/settings/sections/indices/_indexed_fields.html'),
      scope: true,
      link: function ($scope, $el, attr) {
        var rowScopes = []; // track row scopes, so they can be destroyed as needed
        $scope.perPage = 25;
        $scope.popularityField = {name: null};

        $scope.columns = [
          { title: 'name' },
          { title: 'type' },
          { title: 'format', info: 'The format that will be applied to valus in this field' },
          { title: 'analyzed', info: 'Analyzed fields may require extra memory to visualize' },
          { title: 'indexed', info: 'Fields that are not indexed are unavailable for search' },
          { title: 'popularity', info: 'A gauge of how often this field is used' }
        ];

        $scope.$watchCollection('indexPattern.fields', function () {
          // clear and destroy row scopes
          _.invoke(rowScopes.splice(0), '$destroy');

          $scope.rows = $scope.indexPattern.getFields().map(function (field) {
            var childScope = $scope.$new();
            setupIndexedField($scope, childScope, field);
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
              {
                markup: formatHtml,
                scope: childScope,
                class: 'cell-hover',
                attr: {
                  'ng-click': 'toggle()'
                }
              },
              field.analyzed,
              field.indexed,
              {
                markup: popularityHtml,
                scope: childScope,
                value: field.count
              }
            ];
          });
        });
      }
    };
  });
});
