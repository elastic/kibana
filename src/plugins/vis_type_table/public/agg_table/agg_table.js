/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import _ from 'lodash';
import { CSV_SEPARATOR_SETTING, CSV_QUOTE_VALUES_SETTING } from '../../../share/public';
import aggTableTemplate from './agg_table.html';
import { getFormatService } from '../services';
import { i18n } from '@kbn/i18n';

export function KbnAggTable(config, RecursionHelper) {
  return {
    restrict: 'E',
    template: aggTableTemplate,
    scope: {
      table: '=',
      dimensions: '=',
      perPage: '=?',
      sort: '=?',
      exportTitle: '=?',
      showTotal: '=',
      totalFunc: '=',
      percentageCol: '=',
      filter: '=',
    },
    controllerAs: 'aggTable',
    compile: function ($el) {
      // Use the compile function from the RecursionHelper,
      // And return the linking function(s) which it returns
      return RecursionHelper.compile($el);
    },
    controller: function ($scope) {
      const self = this;

      self._saveAs = require('@elastic/filesaver').saveAs;
      self.csv = {
        separator: config.get(CSV_SEPARATOR_SETTING),
        quoteValues: config.get(CSV_QUOTE_VALUES_SETTING),
      };

      self.exportAsCsv = function (formatted) {
        const csv = new Blob([self.toCsv(formatted)], { type: 'text/plain;charset=utf-8' });
        self._saveAs(csv, self.csv.filename);
      };

      self.toCsv = function (formatted) {
        const rows = formatted ? $scope.rows : $scope.table.rows;
        const columns = formatted ? [...$scope.formattedColumns] : [...$scope.table.columns];

        if ($scope.splitRow && formatted) {
          columns.unshift($scope.splitRow);
        }

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

        let csvRows = [];
        for (const row of rows) {
          const rowArray = [];
          for (const col of columns) {
            const value = row[col.id];
            const formattedValue =
              formatted && col.formatter ? escape(col.formatter.convert(value)) : escape(value);
            rowArray.push(formattedValue);
          }
          csvRows = [...csvRows, rowArray];
        }

        // add the columns to the rows
        csvRows.unshift(
          columns.map(function (col) {
            return escape(formatted ? col.title : col.name);
          })
        );

        return csvRows
          .map(function (row) {
            return row.join(self.csv.separator) + '\r\n';
          })
          .join('');
      };

      $scope.$watchMulti(
        ['table', 'exportTitle', 'percentageCol', 'totalFunc', '=scope.dimensions'],
        function () {
          const { table, exportTitle, percentageCol } = $scope;
          const showPercentage = percentageCol !== '';

          if (!table) {
            $scope.rows = null;
            $scope.formattedColumns = null;
            $scope.splitRow = null;
            return;
          }

          self.csv.filename = (exportTitle || table.title || 'table') + '.csv';
          $scope.rows = table.rows;
          $scope.formattedColumns = [];

          if (typeof $scope.dimensions === 'undefined') return;

          const { buckets, metrics, splitColumn, splitRow } = $scope.dimensions;

          $scope.formattedColumns = table.columns
            .map(function (col, i) {
              const isBucket = buckets.find((bucket) => bucket.accessor === i);
              const isSplitColumn = splitColumn
                ? splitColumn.find((splitColumn) => splitColumn.accessor === i)
                : undefined;
              const isSplitRow = splitRow
                ? splitRow.find((splitRow) => splitRow.accessor === i)
                : undefined;
              const dimension =
                isBucket || isSplitColumn || metrics.find((metric) => metric.accessor === i);

              const formatter = dimension
                ? getFormatService().deserialize(dimension.format)
                : undefined;

              const formattedColumn = {
                id: col.id,
                title: col.name,
                formatter: formatter,
                filterable: !!isBucket,
              };

              if (isSplitRow) {
                $scope.splitRow = formattedColumn;
              }

              if (!dimension) return;

              const last = i === table.columns.length - 1;

              if (last || !isBucket) {
                formattedColumn.class = 'visualize-table-right';
              }

              const isDate =
                dimension.format?.id === 'date' || dimension.format?.params?.id === 'date';
              const allowsNumericalAggregations = formatter?.allowsNumericalAggregations;

              let { totalFunc } = $scope;
              if (typeof totalFunc === 'undefined' && showPercentage) {
                totalFunc = 'sum';
              }

              if (allowsNumericalAggregations || isDate || totalFunc === 'count') {
                const sum = (tableRows) => {
                  return _.reduce(
                    tableRows,
                    function (prev, curr) {
                      // some metrics return undefined for some of the values
                      // derivative is an example of this as it returns undefined in the first row
                      if (curr[col.id] === undefined) return prev;
                      return prev + curr[col.id];
                    },
                    0
                  );
                };

                formattedColumn.sumTotal = sum(table.rows);
                switch (totalFunc) {
                  case 'sum': {
                    if (!isDate) {
                      const total = formattedColumn.sumTotal;
                      formattedColumn.formattedTotal = formatter.convert(total);
                      formattedColumn.total = formattedColumn.sumTotal;
                    }
                    break;
                  }
                  case 'avg': {
                    if (!isDate) {
                      const total = sum(table.rows) / table.rows.length;
                      formattedColumn.formattedTotal = formatter.convert(total);
                      formattedColumn.total = total;
                    }
                    break;
                  }
                  case 'min': {
                    const total = _.chain(table.rows).map(col.id).min().value();
                    formattedColumn.formattedTotal = formatter.convert(total);
                    formattedColumn.total = total;
                    break;
                  }
                  case 'max': {
                    const total = _.chain(table.rows).map(col.id).max().value();
                    formattedColumn.formattedTotal = formatter.convert(total);
                    formattedColumn.total = total;
                    break;
                  }
                  case 'count': {
                    const total = table.rows.length;
                    formattedColumn.formattedTotal = total;
                    formattedColumn.total = total;
                    break;
                  }
                  default:
                    break;
                }
              }

              return formattedColumn;
            })
            .filter((column) => column);

          if (showPercentage) {
            const insertAtIndex = _.findIndex($scope.formattedColumns, { title: percentageCol });

            // column to show percentage for was removed
            if (insertAtIndex < 0) return;

            const { cols, rows } = addPercentageCol(
              $scope.formattedColumns,
              percentageCol,
              table.rows,
              insertAtIndex
            );
            $scope.rows = rows;
            $scope.formattedColumns = cols;
          }
        }
      );
    },
  };
}

/**
 * @param {Object[]} columns - the formatted columns that will be displayed
 * @param {String} title - the title of the column to add to
 * @param {Object[]} rows - the row data for the columns
 * @param {Number} insertAtIndex - the index to insert the percentage column at
 * @returns {Object} - cols and rows for the table to render now included percentage column(s)
 */
function addPercentageCol(columns, title, rows, insertAtIndex) {
  const { id, sumTotal } = columns[insertAtIndex];
  const newId = `${id}-percents`;
  const formatter = getFormatService().deserialize({ id: 'percent' });
  const i18nTitle = i18n.translate('visTypeTable.params.percentageTableColumnName', {
    defaultMessage: '{title} percentages',
    values: { title },
  });
  const newCols = insert(columns, insertAtIndex, {
    title: i18nTitle,
    id: newId,
    formatter,
  });
  const newRows = rows.map((row) => ({
    [newId]: row[id] / sumTotal,
    ...row,
  }));

  return { cols: newCols, rows: newRows };
}

function insert(arr, index, ...items) {
  const newArray = [...arr];
  newArray.splice(index + 1, 0, ...items);
  return newArray;
}
