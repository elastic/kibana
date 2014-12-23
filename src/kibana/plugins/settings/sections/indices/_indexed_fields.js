define(function (require) {
  var _ = require('lodash');
  require('components/paginated_table/paginated_table');

  require('modules').get('apps/settings')
  .directive('indexedFields', function () {
    var popularityHtml = require('text!plugins/settings/sections/indices/_popularity.html');

    return {
      restrict: 'E',
      template: require('text!plugins/settings/sections/indices/_indexed_fields.html'),
      scope: true,
      link: function ($scope, $el, attr) {
        var rowScopes = []; // track row scopes, so they can be destroyed as needed
        $scope.perPage = 25;

        $scope.columns = [{
          title: 'name'
        }, {
          title: 'type'
        }, {
          title: 'analyzed',
          info: 'Analyzed fields may require extra memory to visualize'
        }, {
          title: 'indexed',
          info: 'Fields that are not indexed are unavailable for search'
        }, {
          title: 'popularity',
          info: 'A gauge of how often this field is used',
        }];

        $scope.showPopularityControls = function (field) {
          $scope.popularityHoverState = (field) ? field : null;
        };

        $scope.$watchCollection('indexPattern.fields', function () {
          _.invoke(rowScopes, '$destroy');

          $scope.rows = $scope.indexPattern.getFields().map(function (field) {
            var childScope = $scope.$new();
            rowScopes.push(childScope);
            childScope.field = field;

            // update the active field via object comparison
            if (_.isEqual(field, $scope.popularityHoverState)) {
              $scope.showPopularityControls(field);
            }

            return [field.name, field.type, field.analyzed, field.indexed,
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