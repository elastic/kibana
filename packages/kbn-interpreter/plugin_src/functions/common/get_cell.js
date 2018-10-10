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

export const getCell = () => ({
  name: 'getCell',
  help: 'Fetch a single cell in a table',
  context: {
    types: ['datatable'],
  },
  args: {
    column: {
      types: ['string'],
      aliases: ['_', 'c'],
      help: 'The name of the column value to fetch',
    },
    row: {
      types: ['number'],
      aliases: ['r'],
      help: 'The row number, starting at 0',
      default: 0,
    },
  },
  fn: (context, args) => {
    const row = context.rows[args.row];
    if (!row) throw new Error(`Row not found: ${args.row}`);

    const { column = context.columns[0].name } = args;
    const value = row[column];

    if (typeof value === 'undefined') throw new Error(`Column not found: ${column}`);

    return value;
  },
});
