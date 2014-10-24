define(function (require) {
  require('modules')
  .get('kibana')
  .directive('kbnAggTable', function ($filter, config, Private) {
    var _ = require('lodash');
    var saveAs = require('file_saver');

    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify_agg_response'));
    var orderBy = $filter('orderBy');

    return {
      restrict: 'E',
      template: require('text!components/agg_table/agg_table.html'),
      scope: {
        rows: '=',
        columns: '=',
        perPage: '=?'
      },
      controllerAs: 'table',
      controller: function ($scope) {
        var self = this;

        self.sort = null;
        self.csv = {
          showOptions: false,
          separator: config.get('csv:separator'),
          quoteValues: config.get('csv:quoteValues'),
          filename: 'table.csv'
        };

        self.colTitle = function (col) {
          var agg = aggConfig(col);
          return agg.type.makeLabel(agg);
        };

        function aggConfig(col) {
          if (!col.aggConfig) {
            throw new TypeError('Column is missing the aggConfig property');
          }
          return col.aggConfig;
        }

        function colField(col) {
          var agg = aggConfig(col);
          return agg.params && agg.params.field;
        }

        self.pickPageCount = function () {
          return $scope.perPage || Infinity;
        };

        self.getColumnClass = function (col, $first, $last) {
          var cls = [];
          var agg = aggConfig(col);

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
            delete self.sort;
          }

          if (self.sort && !self.sort.getter) {
            var colI = $scope.columns.indexOf(self.sort.col);
            self.sort.getter = function (row) {
              return row[colI];
            };
            if (colI === -1) delete self.sort;
          }
        };

        self.exportAsCsv = function () {
          self.csv.showOptions = false;
          if (!$scope.rows || !$scope.columns) return;

          var text = '';
          var nonAlphaNumRE = /[^a-zA-Z0-9]/;
          var allDoubleQuoteRE = /"/g;
          var escape = function (val) {
            val = String(val);
            if (self.csv.quoteValues && nonAlphaNumRE.test(val)) {
              val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
            }
            return val;
          };

          // escape each cell in each row
          var csvRows = $scope.rows.map(function (row, i) {
            return row.map(escape);
          });

          // add the columns to the rows
          csvRows.unshift($scope.columns.map(_.compose(escape, self.colTitle)));

          var blob = new Blob(csvRows.map(function (row) {
            return row.join(self.csv.separator) + '\r\n';
          }), { type: 'text/plain' });

          saveAs(blob, self.csv.filename);
        };

        $scope.$watchMulti([
          'columns',
          'rows',
          'table.sort.asc',
          'table.sort.field'
        ], function () {
          if (!$scope.rows || !$scope.columns) {
            return;
          }

          var formatters = $scope.columns.map(function (col) {
            var field = colField(col);
            return field ? field.format.convert : _.identity;
          });

          // sort the row values, not formatted
          if (self.sort) {
            $scope.formattedRows = orderBy($scope.rows, self.sort.getter, self.sort.asc);
          } else {
            $scope.formattedRows = null;
          }

          // format all row values
          $scope.formattedRows = ($scope.formattedRows || $scope.rows).map(function (row) {
            return row.map(function (cell, i) {
              return formatters[i](cell);
            });
          });
        });
      }
    };
  });
});
