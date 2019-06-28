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

import 'angular';
import 'angular-recursion';
import '../paginated_table';
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import aggTableTemplate from './agg_table.html';
import { getFormat } from 'ui/visualize/loader/pipeline_helpers/utilities';

uiModules
  .get('kibana', ['RecursionHelper'])
  .directive('kbnAggTable', function (config, RecursionHelper) {

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
            return Object.entries(row).map(([k, v]) => {
              return escape(formatted ? columns.find(c => c.id === k).formatter.convert(v) : v);
            });
          });

          // add the columns to the rows
          csvRows.unshift(columns.map(function (col) {
            return escape(formatted ? col.title : col.name);
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

          self.csv.filename = ($scope.exportTitle || table.title || 'table') + '.csv';
          $scope.rows = table.rows;
          $scope.formattedColumns = table.columns.map(function (col, i) {
            const isBucket = $scope.dimensions.buckets.find(bucket => bucket.accessor === i);
            const dimension = isBucket || $scope.dimensions.metrics.find(metric => metric.accessor === i);
            if (!dimension) return;

            const formatter = getFormat(dimension.format);

            const formattedColumn = {
              id: col.id,
              title: col.name,
              formatter: formatter,
              filterable: !!isBucket
            };

            const last = i === (table.columns.length - 1);

            if (last || !isBucket) {
              formattedColumn.class = 'visualize-table-right';
            }

            const isDate = _.get(dimension, 'format.id') === 'date' || _.get(dimension, 'format.params.id') === 'date';
            const isNumeric = _.get(dimension, 'format.id') === 'number' || _.get(dimension, 'format.params.id') === 'number';

            if (isNumeric || isDate || $scope.totalFunc === 'count') {
              const sum = tableRows => {
                return _.reduce(tableRows, function (prev, curr) {
                // some metrics return undefined for some of the values
                // derivative is an example of this as it returns undefined in the first row
                  if (curr[col.id] === undefined) return prev;
                  return prev + curr[col.id];
                }, 0);
              };

              switch ($scope.totalFunc) {
                case 'sum':
                  if (!isDate) {
                    formattedColumn.total = formatter.convert(sum(table.rows));
                  }
                  break;
                case 'avg':
                  if (!isDate) {
                    formattedColumn.total = formatter.convert(sum(table.rows) / table.rows.length);
                  }
                  break;
                case 'min':
                  formattedColumn.total = formatter.convert(_.chain(table.rows).map(col.id).min().value());
                  break;
                case 'max':
                  formattedColumn.total = formatter.convert(_.chain(table.rows).map(col.id).max().value());
                  break;
                case 'count':
                  formattedColumn.total = table.rows.length;
                  break;
                default:
                  break;
              }
            }

            return formattedColumn;
          }).filter(column => column);
        });
      }
    };
  });
