import 'ui/paginated_table';
import 'ui/compile_recursive_directive';
import 'ui/agg_table/agg_table.less';
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import aggTableTemplate from 'ui/agg_table/agg_table.html';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';

uiModules
.get('kibana')
.directive('kbnAggTable', function ($filter, config, Private, compileRecursiveDirective) {
  const fieldFormats = Private(RegistryFieldFormatsProvider);
  const numberFormatter = fieldFormats.getDefaultInstance('number').getConverterFor('text');

  return {
    restrict: 'E',
    template: aggTableTemplate,
    scope: {
      table: '=',
      perPage: '=?',
      sort: '=?',
      exportTitle: '=?',
      showTotal: '=',
      totalFunc: '='
    },
    controllerAs: 'aggTable',
    compile: function ($el) {
      // Use the compile function from the RecursionHelper,
      // And return the linking function(s) which it returns
      return compileRecursiveDirective.compile($el);
    },
    controller: function ($scope) {
      const self = this;

      self._saveAs = require('@spalger/filesaver').saveAs;
      self.csv = {
        separator: config.get('csv:separator'),
        quoteValues: config.get('csv:quoteValues')
      };

      self.exportAsCsv = function (formatted) {
        const csv = new Blob([self.toCsv(formatted)], { type: 'text/plain;charset=utf-8' });
        self._saveAs(csv, self.csv.filename);
      };

      self.toCsv = function (formatted) {
        const rows = $scope.table.rows;
        const columns = formatted ? $scope.formattedColumns : $scope.table.columns;
        const nonAlphaNumRE = /[^a-zA-Z0-9]/;
        const allDoubleQuoteRE = /"/g;

        function escape(val) {
          if (!formatted && _.isObject(val)) val = val.valueOf();
          val = String(val);
          if (self.csv.quoteValues && nonAlphaNumRE.test(val)) {
            val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
          }
          return val;
        }

        // escape each cell in each row
        const csvRows = rows.map(function (row) {
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
        const table = $scope.table;

        if (!table) {
          $scope.rows = null;
          $scope.formattedColumns = null;
          return;
        }

        self.csv.filename = ($scope.exportTitle || table.title() || 'table') + '.csv';
        $scope.rows = table.rows;
        $scope.formattedColumns = table.columns.map(function (col, i) {
          const agg = $scope.table.aggConfig(col);
          const field = agg.getField();
          const formattedColumn = {
            title: col.title,
            filterable: field && field.filterable && agg.schema.group === 'buckets'
          };

          const last = i === (table.columns.length - 1);

          if (last || (agg.schema.group === 'metrics')) {
            formattedColumn.class = 'visualize-table-right';
          }

          let isFieldNumeric = false;
          let isFieldDate = false;
          const aggType = agg.type;
          if (aggType && aggType.type === 'metrics') {
            if (aggType.name === 'top_hits') {
              if (agg._opts.params.aggregate !== 'concat') {
                // all other aggregate types for top_hits output numbers
                // so treat this field as numeric
                isFieldNumeric = true;
              }
            } else if (field) {
              // if the metric has a field, check if it is either number or date
              isFieldNumeric = field.type === 'number';
              isFieldDate = field.type === 'date';
            } else {
              // if there is no field, then it is count or similar so just say number
              isFieldNumeric = true;
            }
          } else if (field) {
            isFieldNumeric = field.type === 'number';
            isFieldDate = field.type === 'date';
          }

          if (isFieldNumeric || isFieldDate || $scope.totalFunc === 'count') {
            function sum(tableRows) {
              return _.reduce(tableRows, function (prev, curr) {
                // some metrics return undefined for some of the values
                // derivative is an example of this as it returns undefined in the first row
                if (curr[i].value === undefined) return prev;
                return prev + curr[i].value;
              }, 0);
            }
            const formatter = agg.fieldFormatter('text');

            switch ($scope.totalFunc) {
              case 'sum':
                if (!isFieldDate) {
                  formattedColumn.total = formatter(sum(table.rows));
                }
                break;
              case 'avg':
                if (!isFieldDate) {
                  formattedColumn.total = formatter(sum(table.rows) / table.rows.length);
                }
                break;
              case 'min':
                formattedColumn.total = formatter(_.chain(table.rows).map(i).map('value').min().value());
                break;
              case 'max':
                formattedColumn.total = formatter(_.chain(table.rows).map(i).map('value').max().value());
                break;
              case 'count':
                formattedColumn.total = numberFormatter(table.rows.length);
                break;
              default:
                break;
            }
          }

          return formattedColumn;
        });
      });
    }
  };
});
