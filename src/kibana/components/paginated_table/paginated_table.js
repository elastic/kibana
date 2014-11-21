define(function (require) {
  require('modules')
  .get('kibana')
  .directive('paginatedTable', function (config, Private) {
    var _ = require('lodash');

    return {
      restrict: 'E',
      template: require('text!components/paginated_table/paginated_table.html'),
      transclude: true,
      scope: {
        rows: '=',
        columns: '=',
        perPage: '=?',
        perPageProp: '=?',
        sortHandler: '=?',
        showSelector: '=?'
      },
      controllerAs: 'paginatedTable',
      controller: function ($scope) {
        var self = this;
        self.sort = {
          columnName: null,
          direction: null
        };

        self.perPage = _.parseInt(self.perPage) || $scope[self.perPageProp];

        self.sortColumn = function (col) {
          if (!$scope.sortHandler) return;

          // TODO: track sort direction

          self._setSortDirection(col.title);
          $scope.sortHandler(col, self.sort);
        };

        self._setSortDirection = function (columnName) {
          if (self.sort.columnName !== columnName) {
            self.sort.direction = 'asc';
          } else {
            var directions = {
              null: 'asc',
              'asc': 'desc',
              'desc': null
            };
            var direction = directions[self.sort.direction];
            self.sort.direction = direction;

          }
          self.sort.columnName = columnName;
        };

        // $scope.$watchMulti([
        //   'rows',
        //   'columns',
        //   'paginatedTable.sort.asc',
        //   'paginatedTable.sort.col'
        // ], function () {
        //   if (!$scope.rows) return;

        //   var formatters = $scope.columns.map(function (col) {
        //     return table.fieldFormatter(col);
        //   });

        //   // sort the row values, not formatted
        //   if (self.sort) {
        //     $scope.formattedRows = orderBy(table.rows, self.sort.getter, !self.sort.asc);
        //   } else {
        //     $scope.formattedRows = null;
        //   }

        //   // format all row values
        //   $scope.formattedRows = ($scope.formattedRows || table.rows).map(function (row) {
        //     return row.map(function (cell, i) {
        //       return formatters[i](cell);
        //     });
        //   });

        //   // update the csv file's title
        //   self.csv.filename = (table.title() || 'table') + '.csv';
        // });
      }
    };
  });
});
