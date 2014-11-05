define(function (require) {
  require('services/compile_recursive_directive');
  require('css!components/agg_table/agg_table.css');

  require('modules')
  .get('kibana')
  .directive('kbnAggTable', function ($filter, config, Private, compileRecursiveDirective) {
    var _ = require('lodash');
    var saveAs = require('file_saver');

    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify'));
    var orderBy = $filter('orderBy');

    return {
      restrict: 'E',
      template: require('text!components/agg_table/agg_table.html'),
      scope: {
        table: '=',
        perPage: '=?'
      },
      controllerAs: 'aggTable',
      compile: function ($el) {
        // Use the compile function from the RecursionHelper,
        // And return the linking function(s) which it returns
        return compileRecursiveDirective.compile($el);
      },
      controller: function ($scope) {
        var self = this;

        self.sort = null;
        self.csv = {
          separator: config.get('csv:separator'),
          quoteValues: config.get('csv:quoteValues')
        };

        self.getColumnClass = function (col, $first, $last) {
          var cls = [];
          var agg = $scope.table.aggConfig(col);

          if ($last || (agg.schema.group === 'metrics')) {
            cls.push('visualize-table-right');
          }

          if (!self.sort || self.sort.field !== col) {
            cls.push('no-sort');
          }

          return cls.join(' ');
        };

        self.cycleSort = function (col) {
          if (!self.sort || self.sort.col !== col) {
            self.sort = {
              col: col,
              asc: true
            };
          } else if (self.sort.asc) {
            self.sort.asc = false;
          } else {
            self.sort = null;
          }

          if (self.sort && !self.sort.getter) {
            var colI = $scope.table.columns.indexOf(self.sort.col);
            self.sort.getter = function (row) {
              return row[colI];
            };
            if (colI === -1) self.sort = null;
          }
        };

        self.exportAsCsv = function () {
          saveAs(new Blob(self.toCsv(), { type: 'text/plain' }), self.csv.filename);
        };

        self.toCsv = function () {
          var rows = $scope.table.rows;
          var columns = $scope.table.columns;
          var nonAlphaNumRE = /[^a-zA-Z0-9]/;
          var allDoubleQuoteRE = /"/g;

          function escape(val) {
            val = String(val);
            if (self.csv.quoteValues && nonAlphaNumRE.test(val)) {
              val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
            }
            return val;
          }

          // escape each cell in each row
          var csvRows = rows.map(function (row, i) {
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

        $scope.$watchMulti([
          'table',
          'aggTable.sort.asc',
          'aggTable.sort.col'
        ], function () {
          var table = $scope.table;

          if (!table) {
            $scope.formattedRows = null;
            return;
          }

          var formatters = table.columns.map(function (col) {
            return table.fieldFormatter(col);
          });

          // sort the row values, not formatted
          if (self.sort) {
            $scope.formattedRows = orderBy(table.rows, self.sort.getter, !self.sort.asc);
          } else {
            $scope.formattedRows = null;
          }

          // format all row values
          $scope.formattedRows = ($scope.formattedRows || table.rows).map(function (row) {
            return row.map(function (cell, i) {
              return formatters[i](cell);
            });
          });

          // update the csv file's title
          self.csv.filename = (table.title() || 'table') + '.csv';
        });
      }
    };
  });
});
