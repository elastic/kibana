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
    },
  };
}
