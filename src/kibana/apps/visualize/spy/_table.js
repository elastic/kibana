define(function (require) {
  var module = require('modules').get('app/visualize');
  var _ = require('lodash');
  var saveAs = require('file_saver');

  return function VisualizeExtrasTable(Notifier, $filter, $rootScope, config) {
    return {
      name: 'table',
      template: require('text!apps/visualize/spy/_table.html'),
      link: function tableLinkFn($scope, $el) {
        var notify = new Notifier();
        var orderBy = $filter('orderBy');

        $scope.sort = null;
        $scope.csv = {
          showOptions: false,
          separator: config.get('csv:separator'),
          quoteValues: config.get('csv:quoteValues'),
          filename: 'table.csv'
        };

        $scope.getColumnClass = function (col, $first, $last) {
          var cls = [];

          if ($last || $scope.fields && $scope.fields[col] && $scope.fields[col].type === 'number') {
            cls.push('visualize-table-right');
          }

          if (!$scope.sort || $scope.sort.field !== col) {
            cls.push('no-sort');
          }

          return cls.join(' ');
        };

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

        $scope.exportAsCsv = function () {
          $scope.csv.showOptions = false;
          if (!$scope.chartData) return;

          var text = '';
          var nonAlphaNumRE = /[^a-zA-Z0-9]/;
          var allDoubleQuoteRE = /"/g;
          var escape = function (val) {
            val = String(val);
            if ($scope.csv.quoteValues && nonAlphaNumRE.test(val)) {
              val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
            }
            return val;
          };

          var raw = $scope.chartData.raw;
          var rows = new Array(raw.rows.length + 1);
          var colRow = [];
          rows[0] = colRow;

          raw.columns.forEach(function (col) {
            colRow.push(escape(col.aggParams ? col.aggParams.field : 'count'));
          });

          raw.rows.forEach(function (rawRow, i) {
            var row = new Array(rawRow.length);
            rows[i + 1] = row;

            rawRow.forEach(function (cell, i) {
              row[i] = escape(cell);
            });
          });

          var blob = new Blob(rows.map(function (row) {
            return row.join($scope.csv.separator) + '\r\n';
          }), { type: 'text/plain' });

          saveAs(blob, $scope.csv.filename);
        };

        $rootScope.$watchMulti.call($scope, [
          'chartData',
          'sort.asc',
          'sort.field'
        ], function () {
          $scope.rows = null;
          $scope.columns = null;

          if (!$scope.chartData) return;

          notify.event('flatten data for table', function () {
            // flatten the fields to a list of strings
            $scope.columns = [];
            // collect the formatter for each column, in order
            var formats = [];

            // populate columns and formates
            $scope.chartData.raw.columns.forEach(function (col) {
              $scope.columns.push(col.aggParams ? col.aggParams.field : 'count');
              formats.push(col.field ? col.field.format.convert : _.identity);
            });


            $scope.rows = $scope.chartData.raw.rows;

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
  };
});