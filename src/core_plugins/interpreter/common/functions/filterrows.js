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

export const filterrows = () => ({
  name: 'filterrows',
  aliases: [],
  type: 'datatable',
  context: {
    types: ['datatable'],
  },
  help: 'Filter rows in a datatable based on the return value of a subexpression.',
  args: {
    fn: {
      resolve: false,
      aliases: ['_'],
      types: ['boolean'],
      help:
        'An expression to pass each rows in the datatable into. The expression should return a boolean. ' +
        'A true value will preserve the row, and a false value will remove it.',
    },
  },
  fn(context, { fn }) {
    const checks = context.rows.map(row =>
      fn({
        ...context,
        rows: [row],
      })
    );

    return Promise.all(checks)
      .then(results => context.rows.filter((row, i) => results[i]))
      .then(rows => ({
        ...context,
        rows,
      }));
  },
});
