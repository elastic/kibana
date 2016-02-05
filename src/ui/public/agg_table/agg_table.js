import 'ui/paginated_table';
import 'ui/compile_recursive_directive';
import 'ui/agg_table/agg_table.less';
import _ from 'lodash';
import uiModules from 'ui/modules';
import aggTableTemplate from 'ui/agg_table/agg_table.html';

uiModules
.get('kibana')
.directive('kbnAggTable', function ($filter, config, Private, compileRecursiveDirective) {

  return {
    restrict: 'E',
    template: aggTableTemplate,
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
      var self = this;

      self.sort = null;
      self._saveAs = require('@spalger/filesaver').saveAs;
      self.csv = {
        separator: config.get('csv:separator'),
        quoteValues: config.get('csv:quoteValues')
      };

      self.exportAsCsv = function (formatted) {
        var csv = new Blob([self.toCsv(formatted)], { type: 'text/plain' });
        self._saveAs(csv, self.csv.filename);
      };

      self.toCsv = function (formatted) {
        var rows = $scope.table.rows;
        var columns = formatted ? $scope.formattedColumns : $scope.table.columns;
        var nonAlphaNumRE = /[^a-zA-Z0-9]/;
        var allDoubleQuoteRE = /"/g;

        function escape(val) {
          if (!formatted && _.isObject(val)) val = val.valueOf();
          val = String(val);
          if (self.csv.quoteValues && nonAlphaNumRE.test(val)) {
            val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
          }
          return val;
        }

        // escape each cell in each row
        var csvRows = rows.map(function (row) {
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
        var table = $scope.table;

        if (!table) {
          $scope.rows = null;
          $scope.formattedColumns = null;
          return;
        }

        self.csv.filename = ($scope.exportTitle || table.title() || 'table') + '.csv';
        $scope.rows = table.rows;
        $scope.formattedColumns = table.columns.map(function (col, i) {
          var agg = $scope.table.aggConfig(col);
          var field = agg.field();
          var formattedColumn = {
            title: col.title,
            filterable: field && field.filterable && agg.schema.group === 'buckets'
          };

          var last = i === (table.columns.length - 1);

          if (last || (agg.schema.group === 'metrics')) {
            formattedColumn.class = 'visualize-table-right';
          }

          return formattedColumn;
        });
      });
    }
  };
});
