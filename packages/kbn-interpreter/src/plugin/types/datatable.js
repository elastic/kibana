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

import { map, zipObject } from 'lodash';

export const datatable = () => ({
  name: 'datatable',
  validate: datatable => {
    // TODO: Check columns types. Only string, boolean, number, date, allowed for now.
    if (!datatable.columns) {
      throw new Error('datatable must have a columns array, even if it is empty');
    }

    if (!datatable.rows) throw new Error('datatable must have a rows array, even if it is empty');
  },
  serialize: datatable => {
    const { columns, rows } = datatable;
    return {
      ...datatable,
      rows: rows.map(row => {
        return columns.map(column => row[column.name]);
      }),
    };
  },
  deserialize: datatable => {
    const { columns, rows } = datatable;
    return {
      ...datatable,
      rows: rows.map(row => {
        return zipObject(map(columns, 'name'), row);
      }),
    };
  },
  from: {
    null: () => {
      return {
        type: 'datatable',
        rows: [],
        columns: [],
      };
    },
    pointseries: context => {
      return {
        type: 'datatable',
        rows: context.rows,
        columns: map(context.columns, (val, name) => {
          return { name: name, type: val.type, role: val.role };
        }),
      };
    },
  },
  to: {
    render: datatable => {
      return {
        type: 'render',
        as: 'table',
        value: {
          datatable,
          paginate: true,
          perPage: 10,
          showHeader: true,
        },
      };
    },
  },
});
