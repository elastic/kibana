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

import { omit, pick, find } from 'lodash';

export const columns = () => ({
  name: 'columns',
  type: 'datatable',
  help:
    'Include or exclude columns from a data table. If you specify both, this will exclude first',
  context: {
    types: ['datatable'],
  },
  args: {
    include: {
      types: ['string'],
      help: 'A comma separated list of column names to keep in the table',
      default: null,
    },
    exclude: {
      types: ['string'],
      help: 'A comma separated list of column names to remove from the table',
      default: null,
    },
  },
  fn: (context, args) => {
    const { include, exclude } = args;

    let result = { ...context };

    if (exclude) {
      const fields = exclude.split(',').map(field => field.trim());
      const columns = result.columns.filter(col => !fields.includes(col.name));
      const rows = columns.length > 0 ? result.rows.map(row => omit(row, fields)) : [];

      result = { ...result, rows, columns };
    }

    if (include) {
      const fields = include.split(',').map(field => field.trim());
      //const columns = result.columns.filter(col => fields.includes(col.name));
      // Include columns in the order the user specified
      const columns = [];
      fields.forEach(field => {
        const column = find(result.columns, { name: field });
        if (column) columns.push(column);
      });
      const rows = columns.length > 0 ? result.rows.map(row => pick(row, fields)) : [];
      result = { ...result, rows, columns };
    }

    return result;
  },
});
