import _ from 'lodash';
import 'ui/filters/short_dots';
import headerHtml from 'ui/doc_table/components/table_header.html';
import { uiModules } from 'ui/modules';
const module = uiModules.get('app/discover');


module.directive('kbnTableHeader', function (shortDotsFilter) {
  return {
    restrict: 'A',
    scope: {
      columns: '=',
      sortOrder: '=',
      indexPattern: '=',
      onChangeSortOrder: '=?',
      onRemoveColumn: '=?',
      onMoveColumn: '=?',
    },
    template: headerHtml,
    controller: function ($scope) {
      const isSortableColumn = function isSortableColumn(columnName) {
        return (
          !!$scope.indexPattern
          && _.isFunction($scope.onChangeSortOrder)
          && _.get($scope, ['indexPattern', 'fields', 'byName', columnName, 'sortable'], false)
        );
      };

      $scope.tooltip = function (column) {
        if (!isSortableColumn(column)) return '';
        return 'Sort by ' + shortDotsFilter(column);
      };

      $scope.canMoveColumnLeft = function canMoveColumn(columnName) {
        return (
          _.isFunction($scope.onMoveColumn)
          && $scope.columns.indexOf(columnName) > 0
        );
      };

      $scope.canMoveColumnRight = function canMoveColumn(columnName) {
        return (
          _.isFunction($scope.onMoveColumn)
          && $scope.columns.indexOf(columnName) < $scope.columns.length - 1
        );
      };

      $scope.canRemoveColumn = function canRemoveColumn(columnName) {
        return (
          _.isFunction($scope.onRemoveColumn)
          && (columnName !== '_source' || $scope.columns.length > 1)
        );
      };

      $scope.headerClass = function (column) {
        if (!isSortableColumn(column)) return;

        const sortOrder = $scope.sortOrder;
        const defaultClass = ['fa', 'fa-sort-up', 'table-header-sortchange'];

        if (!sortOrder || column !== sortOrder[0]) return defaultClass;
        return ['fa', sortOrder[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'];
      };

      $scope.moveColumnLeft = function moveLeft(columnName) {
        const newIndex = $scope.columns.indexOf(columnName) - 1;

        if (newIndex < 0) {
          return;
        }

        $scope.onMoveColumn(columnName, newIndex);
      };

      $scope.moveColumnRight = function moveRight(columnName) {
        const newIndex = $scope.columns.indexOf(columnName) + 1;

        if (newIndex >= $scope.columns.length) {
          return;
        }

        $scope.onMoveColumn(columnName, newIndex);
      };

      $scope.cycleSortOrder = function cycleSortOrder(columnName) {
        if (!isSortableColumn(columnName)) {
          return;
        }

        const [currentColumnName, currentDirection = 'asc'] = $scope.sortOrder;
        const newDirection = (
          (columnName === currentColumnName && currentDirection === 'asc')
          ? 'desc'
          : 'asc'
        );

        $scope.onChangeSortOrder(columnName, newDirection);
      };
    }
  };
});
