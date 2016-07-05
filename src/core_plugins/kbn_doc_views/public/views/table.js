import _ from 'lodash';
import docViewsRegistry from 'ui/registry/doc_views';

import tableHtml from './table.html';

docViewsRegistry.register(function () {
  return {
    title: 'Table',
    order: 10,
    directive: {
      template: tableHtml,
      scope: {
        hit: '=',
        indexPattern: '=',
        filter: '=',
        columns: '='
      },
      controller: function ($scope) {
        $scope.mapping = $scope.indexPattern.fields.byName;
        $scope.flattened = $scope.indexPattern.flattenHit($scope.hit);
        $scope.formatted = $scope.indexPattern.formatHit($scope.hit);
        $scope.fields = _.keys($scope.flattened).sort();

        $scope.toggleColumn = function (fieldName) {
          _.toggleInOut($scope.columns, fieldName);
        };

        $scope.showArrayInObjectsWarning = function (row, field) {
          let value = $scope.flattened[field];
          return _.isArray(value) && typeof value[0] === 'object';
        };
      }
    }
  };
});
