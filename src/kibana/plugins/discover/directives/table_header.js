define(function (require) {
  var _ = require('lodash');
  var module = require('modules').get('app/discover');

  require('filters/short_dots');

  module.directive('kbnTableHeader', function () {
    var headerHtml = require('text!plugins/discover/partials/table_header.html');
    return {
      restrict: 'A',
      scope: {
        columns: '=',
        sorting: '=',
        indexPattern: '=',
        timefield: '=?'
      },
      template: headerHtml,
      controller: function ($scope) {
        var sortableField = function (field) {
          return $scope.indexPattern.fields.byName[field].sortable;
        };

        $scope.headerClass = function (column) {
          if (!sortableField(column)) return;

          var sorting = $scope.sorting;
          var defaultClass = ['fa', 'fa-sort', 'table-header-sortchange'];

          if (!sorting) return defaultClass;

          if (column === sorting[0]) {
            return ['fa', sorting[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'];
          } else {
            return defaultClass;
          }
        };

        $scope.moveLeft = function (column) {
          var index = _.indexOf($scope.columns, column);
          if (index === 0) return;

          _.move($scope.columns, index, --index);
        };

        $scope.moveRight = function (column) {
          var index = _.indexOf($scope.columns, column);
          if (index === $scope.columns.length - 1) return;

          _.move($scope.columns, index, ++index);
        };

        $scope.sort = function (column) {
          if (!sortableField(column)) return;

          var sorting = $scope.sorting || [];
          $scope.sorting = [column, sorting[1] === 'asc' ? 'desc' : 'asc'];
        };

      }
    };
  });
});