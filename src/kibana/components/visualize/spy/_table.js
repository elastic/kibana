define(function (require) {
  function VisSpyTableProvider(Notifier, $filter, $rootScope, config, Private) {
    var _ = require('lodash');
    var saveAs = require('file_saver');
    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify_agg_response'));

    return {
      name: 'table',
      display: 'Table',
      order: 1,
      template: require('text!components/visualize/spy/_table.html'),
      link: function tableLinkFn($scope, $el) {
        var notify = new Notifier();
        var orderBy = $filter('orderBy');
        var perPageDefault = 10;
        var perPageExtended = 20;

        $scope.$parent.$watch('spyMode.fill', function (fill) {
          $scope.perPage = (fill) ? perPageExtended : perPageDefault;
        });

        $scope.sort = null;
        $scope.csv = {
          showOptions: false,
          separator: config.get('csv:separator'),
          quoteValues: config.get('csv:quoteValues'),
          filename: 'table.csv'
        };

        $scope.colTitle = function (col) {
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

        $scope.getColumnClass = function (col, $first, $last) {
          var cls = [];
          var agg = aggConfig(col);

          if ($last || (agg.schema.group === 'metrics')) {
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
          'vis',
          'esResp',
          'sort.asc',
          'sort.field'
        ], notify.timed('flatten data for table', function () {
          if (!$scope.vis || !$scope.esResp) {
            $scope.rows = $scope.columns = null;
            return;
          }

          var tabbed = tabifyAggResponse($scope.vis, $scope.esResp);
          $scope.rows = tabbed.rows;
          $scope.columns = tabbed.columns;

          var formatters = $scope.columns.map(function (col) {
            var field = colField(col);
            return field ? field.format.convert : _.identity;
          });

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

        }));
      }
    };
  }

  require('registry/spy_modes').register(VisSpyTableProvider);
});
