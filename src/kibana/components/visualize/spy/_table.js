define(function (require) {
  var module = require('modules').get('app/visualize');
  var _ = require('lodash');
  var saveAs = require('file_saver');

  return function VisSpyTable(Notifier, $filter, $rootScope, config) {
    return {
      name: 'table',
      display: 'Table',
      template: require('text!components/visualize/spy/_table.html'),
      link: function tableLinkFn($scope, $el) {
        var notify = new Notifier();
        var orderBy = $filter('orderBy');
        var perPageDefault = 10;
        var perPageExtended = 20;

        // TODO: finish this - the list should get longer in full screen mode
        // $scope.$parent.$watch('spyMode.fill', function (fill) {
        //   $scope.perPage = (fill) ? perPageExtended : perPageDefault;
        // });
        $scope.perPage = perPageDefault;

        $scope.sort = null;
        $scope.csv = {
          showOptions: false,
          separator: config.get('csv:separator'),
          quoteValues: config.get('csv:quoteValues'),
          filename: 'table.csv'
        };

        $scope.colTitle = function (col) {
          var aggConfig = col.aggConfig;
          if (!aggConfig) return 'count';
          if (aggConfig.schema.group !== 'metrics') return col.field.name;
          return aggConfig.type.makeLabel(aggConfig);
        };

        $scope.getColumnClass = function (col, $first, $last) {
          var cls = [];

          if ($last || (col.field && col.field.type === 'number')) {
            cls.push('visualize-table-right');
          }

          if (!$scope.sort || $scope.sort.field !== col) {
            cls.push('no-sort');
          }

          return cls.join(' ');
        };

        $scope.cycleSort = function (col) {
          if (!$scope.sort || $scope.sort.col !== col) {
            $scope.sort = {
              col: col,
              asc: true
            };
          } else if ($scope.sort.asc) {
            $scope.sort.asc = false;
          } else {
            delete $scope.sort;
          }

          if ($scope.sort && !$scope.sort.getter) {
            var colI = $scope.columns.indexOf($scope.sort.col);
            $scope.sort.getter = function (row) {
              return row[colI];
            };
            if (colI === -1) delete $scope.sort;
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
            colRow.push(escape($scope.colTitle(col)));
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
          if (!$scope.chartData) {
            $scope.rows = $scope.columns = null;
            return;
          }

          $scope.rows = $scope.chartData.raw.rows;
          $scope.columns = $scope.chartData.raw.columns;

          var formatters = $scope.columns.map(function (col) {
            return (col.field) ? col.field.format.convert : _.identity;
          });

          notify.event('flatten data for table', function () {

            // sort the row values
            if ($scope.sort) {
              $scope.rows = orderBy($scope.rows, $scope.sort.getter, $scope.sort.asc);
            }

            // format all row values
            $scope.rows = $scope.rows.map(function (row) {
              return row.map(function (cell, i) {
                return formatters[i](cell);
              });
            });
          });
        });
      }
    };
  };
});