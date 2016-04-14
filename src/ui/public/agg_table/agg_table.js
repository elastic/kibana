define(function (require) {
  require('ui/paginated_table');
  require('ui/compile_recursive_directive');
  require('ui/agg_table/agg_table.less');

  require('ui/modules')
  .get('kibana')
  .directive('kbnAggTable', function ($filter, config, Private, compileRecursiveDirective) {
    let _ = require('lodash');

    return {
      restrict: 'E',
      template: require('ui/agg_table/agg_table.html'),
      scope: {
        table: '=',
        perPage: '=?',
        exportTitle: '=?'
      },
      controllerAs: 'aggTable',
      compile: function ($el) {
        // Use the compile function from the RecursionHelper,
        // And return the linking function(s) which it returns
        return compileRecursiveDirective.compile($el);
      },
      controller: function ($scope) {
        let self = this;

        self.sort = null;
        self._saveAs = require('@spalger/filesaver').saveAs;
        self.csv = {
          separator: config.get('csv:separator'),
          quoteValues: config.get('csv:quoteValues')
        };

        self.exportAsCsv = function (formatted) {
          let csv = new Blob([self.toCsv(formatted)], { type: 'text/plain' });
          self._saveAs(csv, self.csv.filename);
        };

        self.toCsv = function (formatted) {
          let rows = $scope.table.rows;
          let columns = formatted ? $scope.formattedColumns : $scope.table.columns;
          let nonAlphaNumRE = /[^a-zA-Z0-9]/;
          let allDoubleQuoteRE = /"/g;

          function escape(val) {
            if (!formatted && _.isObject(val)) val = val.valueOf();
            val = String(val);
            if (self.csv.quoteValues && nonAlphaNumRE.test(val)) {
              val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
            }
            return val;
          }

          // escape each cell in each row
          let csvRows = rows.map(function (row) {
            return row.map(escape);
          });

          // add the columns to the rows
          csvRows.unshift(columns.map(function (col) {
            return escape(col.title);
          }));

          return csvRows.map(function (row) {
            return row.join(self.csv.separator) + '\r\n';
          }).join('');
        };

        $scope.$watch('table', function () {
          let table = $scope.table;

          if (!table) {
            $scope.rows = null;
            $scope.formattedColumns = null;
            return;
          }

          self.csv.filename = ($scope.exportTitle || table.title() || 'table') + '.csv';
          $scope.rows = table.rows;
          $scope.formattedColumns = table.columns.map(function (col, i) {
            let agg = $scope.table.aggConfig(col);
            let field = agg.field();
            let formattedColumn = {
              title: col.title,
              filterable: field && field.filterable && agg.schema.group === 'buckets'
            };

            let last = i === (table.columns.length - 1);

            if (last || (agg.schema.group === 'metrics')) {
              formattedColumn.class = 'visualize-table-right';
            }

            return formattedColumn;
          });
        });
      }
    };
  });
});
