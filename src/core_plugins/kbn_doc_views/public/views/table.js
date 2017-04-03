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
        $scope.visible = {};

        $scope.toggleColumn = function (fieldName) {
          _.toggleInOut($scope.columns, fieldName);
        };

        $scope.visible = function (row, field, pos) {
          let key = field;
          if (pos !== undefined) {
            key += pos;
          }
          return $scope.visible[key];
        };

        $scope.toggleVisible = function (field, pos) {
          let key = field;
          if (pos !== undefined) {
            key += pos;
          }
          if ($scope.visible[key] === undefined) {
            $scope.visible[key] = key;
          } else {
            $scope.visible[key] = undefined;
          }
        };

        $scope.showArrayInObjectsWarning = function (row, field) {
          let value = $scope.flattened[field];
          if (row !== undefined) {
            value = row[field];
          }
          return _.isArray(value) && typeof value[0] === 'object';
        };

        $scope.rowSummary = function (row, fieldName, pos) {
          const indexPattern = $scope.indexPattern;
          const partials = $scope.hit.$$_partialFormatted;
          let key = fieldName;
          let text = '';
          if (pos !== undefined) {
            key += pos;
          }
          if (partials && partials[key] != null) {
            text = partials[key];
          } else {
            text = partials[key] = JSON.stringify(row);
          }

          return _.trunc(text, { 'length':200 });
        };
      }
    }
  };
});
