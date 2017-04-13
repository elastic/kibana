import _ from 'lodash';
import { DocViewsRegistryProvider } from 'ui/registry/doc_views';

import tableHtml from './table.html';

DocViewsRegistryProvider.register(function () {
  return {
    title: 'Table',
    order: 10,
    directive: {
      template: tableHtml,
      scope: {
        hit: '=',
        indexPattern: '=',
        filter: '=',
        columns: '=',
        onAddColumn: '=',
        onRemoveColumn: '=',
      },
      controller: function ($scope) {
        $scope.mapping = $scope.indexPattern.fields.byName;
        $scope.flattened = $scope.indexPattern.flattenHit($scope.hit);
        $scope.formatted = $scope.indexPattern.formatHit($scope.hit);
        $scope.fields = _.keys($scope.flattened).sort();

        $scope.canToggleColumns = function canToggleColumn() {
          return (
            _.isFunction($scope.onAddColumn)
            && _.isFunction($scope.onRemoveColumn)
          );
        };

        $scope.toggleColumn = function toggleColumn(columnName) {
          if ($scope.columns.includes(columnName)) {
            $scope.onRemoveColumn(columnName);
          } else {
            $scope.onAddColumn(columnName);
          }
        };

        $scope.showArrayInObjectsWarning = function (row, field) {
          const value = $scope.flattened[field];
          return _.isArray(value) && typeof value[0] === 'object';
        };
      }
    }
  };
});
