define(function (require) {
  var module = require('modules').get('app/visualize');
  var _ = require('lodash');

  module.directive('visualizeTable', function (Notifier, $filter, $rootScope) {
    return {
      restrict: 'E',
      template: require('text!../partials/visualize_table.html'),
      scope: {
        rawRows: '=rows',
        rawColumns: '=columns',
        show: '='
      },
      link: function ($scope, $el) {
        var notify = new Notifier();
        var orderBy = $filter('orderBy');
        $scope.sort = null;

        $scope.cycleSort = function (col) {
          if (!$scope.sort || $scope.sort.field !== col) {
            $scope.sort = {
              field: col,
              asc: true
            };
          } else if ($scope.sort.asc) {
            $scope.sort.asc = false;
          } else {
            delete $scope.sort;
          }

          if ($scope.sort && !$scope.sort.getter) {
            var fieldi = $scope.columns.indexOf($scope.sort.field);
            $scope.sort.getter = function (row) {
              return row[fieldi];
            };
            if (fieldi === -1) delete $scope.sort;
          }
        };

        $rootScope.$watchMulti.call($scope, [
          'rawRows',
          'rawColumns',
          'show',
          'sort.asc',
          'sort.field'
        ], function () {
          $scope.rows = null;
          $scope.columns = null;

          if (!$scope.show) return;

          notify.event('flatten data for table', function () {
            // flatten the fields to a list of strings
            $scope.columns = [];
            // collect the formatter for each column, in order
            var formats = [];

            // populate columns and formates
            $scope.rawColumns.forEach(function (col) {
              $scope.columns.push(col.aggParams ? col.aggParams.field : 'count');
              formats.push(col.field ? col.field.format.convert : _.identity);
            });


            $scope.rows = $scope.rawRows;

            // sort the row values
            if ($scope.sort) $scope.rows = orderBy($scope.rows, $scope.sort.getter, $scope.sort.asc);

            // format all row values
            $scope.rows = $scope.rows.map(function (row) {
              return row.map(function (cell, i) {
                return formats[i](cell);
              });
            });
          });
        });
      }
    };
  });
});