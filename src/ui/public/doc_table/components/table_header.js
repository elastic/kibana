import _ from 'lodash';
import 'ui/filters/short_dots';
import headerHtml from 'ui/doc_table/components/table_header.html';
import uiModules from 'ui/modules';
const module = uiModules.get('app/discover');


module.directive('kbnTableHeader', function (shortDotsFilter) {
  return {
    restrict: 'A',
    scope: {
      columns: '=',
      sortOrder: '=',
      indexPattern: '=',
      onChangeSortOrder: '=?',
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

      $scope.canRemove = function (name) {
        return (name !== '_source' || $scope.columns.length !== 1);
      };

      $scope.headerClass = function (column) {
        if (!isSortableColumn(column)) return;

        const sortOrder = $scope.sortOrder;
        const defaultClass = ['fa', 'fa-sort-up', 'table-header-sortchange'];

        if (!sortOrder || column !== sortOrder[0]) return defaultClass;
        return ['fa', sortOrder[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'];
      };

      $scope.moveLeft = function (column) {
        let index = _.indexOf($scope.columns, column);
        if (index === 0) return;

        _.move($scope.columns, index, --index);
      };

      $scope.moveRight = function (column) {
        let index = _.indexOf($scope.columns, column);
        if (index === $scope.columns.length - 1) return;

        _.move($scope.columns, index, ++index);
      };

      $scope.toggleColumn = function (fieldName) {
        _.toggleInOut($scope.columns, fieldName);
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
