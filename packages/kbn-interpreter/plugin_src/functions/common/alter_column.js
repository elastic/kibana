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

import { omit } from 'lodash';

export const alterColumn = () => ({
  name: 'alterColumn',
  type: 'datatable',
  help: 'Converts between core types, eg string, number, null, boolean, date and rename columns',
  context: {
    types: ['datatable'],
  },
  args: {
    column: {
      aliases: ['_'],
      types: ['string'],
      help: 'The name of the column to alter',
    },
    type: {
      types: ['string'],
      help: 'The type to convert the column to. Leave blank to not change type.',
      default: null,
    },
    name: {
      types: ['string'],
      help: 'The resultant column name. Leave blank to not rename.',
      default: null,
    },
  },
  fn: (context, args) => {
    if (!args.column || (!args.type && !args.name)) return context;

    const column = context.columns.find(col => col.name === args.column);
    if (!column) throw new Error(`Column not found: '${args.column}'`);

    const name = args.name || column.name;
    const type = args.type || column.type;

    const columns = context.columns.reduce((all, col) => {
      if (col.name !== args.name) {
        if (col.name !== column.name) all.push(col);
        else all.push({ name, type });
      }
      return all;
    }, []);

    let handler = val => val;

    if (args.type) {
      handler = (function getHandler() {
        switch (type) {
          case 'string':
            if (column.type === 'date') return v => new Date(v).toISOString();
            return String;
          case 'number':
            return Number;
          case 'date':
            return v => new Date(v).valueOf();
          case 'boolean':
            return Boolean;
          case 'null':
            return () => null;
          default:
            throw new Error(`Cannot convert to ${type}`);
        }
      }());
    }

    const rows = context.rows.map(row => ({
      ...omit(row, column.name),
      [name]: handler(row[column.name]),
    }));

    return {
      type: 'datatable',
      columns,
      rows,
    };
  },
});
