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

import Papa from 'papaparse';

export const csv = () => ({
  name: 'csv',
  type: 'datatable',
  context: {
    types: ['null'],
  },
  args: {
    data: {
      aliases: ['_'],
      types: ['string'],
      help: 'CSV data to use',
    },
    delimiter: {
      types: ['string'],
      help: 'Data separation character',
    },
    newline: {
      types: ['string'],
      help: 'Row separation character',
    },
  },
  help: 'Create datatable from csv input',
  fn(context, args) {
    const { data: csvString, delimiter, newline } = args;

    const config = {
      transform: val => {
        if (val.indexOf('"') >= 0) {
          const trimmed = val.trim();
          return trimmed.replace(/(^\"|\"$)/g, '');
        }
        return val;
      },
    };

    if (delimiter != null) config.delimiter = delimiter;
    if (newline != null) config.newline = newline;

    // TODO: handle errors, check output.errors
    const output = Papa.parse(csvString, config);

    // output.data is an array of arrays, rows and values in each row
    return output.data.reduce(
      (acc, row, i) => {
        if (i === 0) {
          // first row, assume header values
          row.forEach(colName => acc.columns.push({ name: colName.trim(), type: 'string' }));
        } else {
          // any other row is a data row
          const rowObj = row.reduce((rowAcc, colValue, j) => {
            const colName = acc.columns[j].name;
            rowAcc[colName] = colValue;
            return rowAcc;
          }, {});

          acc.rows.push(rowObj);
        }

        return acc;
      },
      {
        type: 'datatable',
        columns: [],
        rows: [],
      }
    );
  },
});
