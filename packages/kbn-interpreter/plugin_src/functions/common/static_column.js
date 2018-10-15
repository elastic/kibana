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

import { getType } from '@kbn/interpreter/common/lib/get_type';

export const staticColumn = () => ({
  name: 'staticColumn',
  type: 'datatable',
  help: 'Add a column with a static value.',
  context: {
    types: ['datatable'],
  },
  args: {
    name: {
      types: ['string'],
      aliases: ['_', 'column'],
      help: 'The name of the new column column',
      required: true,
    },
    value: {
      types: ['string', 'number', 'boolean', 'null'],
      help:
        'The value to insert in each column. Tip: use a sub-expression to rollup other columns into a static value',
      default: null,
    },
  },
  fn: (context, args) => {
    const rows = context.rows.map(row => ({ ...row, [args.name]: args.value }));
    const type = getType(rows[0][args.name]);
    const columns = [...context.columns];
    const existingColumnIndex = columns.findIndex(({ name }) => name === args.name);
    const newColumn = { name: args.name, type };

    if (existingColumnIndex > -1) columns[existingColumnIndex] = newColumn;
    else columns.push(newColumn);

    return {
      type: 'datatable',
      columns,
      rows,
    };
  },
});
