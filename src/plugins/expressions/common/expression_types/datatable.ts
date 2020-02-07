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

import { map, pick, zipObject } from 'lodash';

import { ExpressionType } from '../types';
import { PointSeries } from './pointseries';
import { Render } from './render';

const name = 'datatable';

/**
 * A Utility function that Typescript can use to determine if an object is a Datatable.
 * @param datatable
 */
export const isDatatable = (datatable: unknown): datatable is Datatable =>
  !!datatable && typeof datatable === 'object' && (datatable as any).type === 'datatable';

/**
 * This type represents the `type` of any `DatatableColumn` in a `Datatable`.
 */
export type DatatableColumnType = 'string' | 'number' | 'boolean' | 'date' | 'null';

/**
 * This type represents a row in a `Datatable`.
 */
export type DatatableRow = Record<string, any>;

/**
 * This type represents the shape of a column in a `Datatable`.
 */
export interface DatatableColumn {
  name: string;
  type: DatatableColumnType;
}

/**
 * A `Datatable` in Canvas is a unique structure that represents tabulated data.
 */
export interface Datatable {
  type: typeof name;
  columns: DatatableColumn[];
  rows: DatatableRow[];
}

export interface SerializedDatatable extends Datatable {
  rows: string[][];
}

interface RenderedDatatable {
  datatable: Datatable;
  paginate: boolean;
  perPage: number;
  showHeader: boolean;
}

export const datatable = (): ExpressionType<typeof name, Datatable, SerializedDatatable> => ({
  name,
  validate: table => {
    // TODO: Check columns types. Only string, boolean, number, date, allowed for now.
    if (!table.columns) {
      throw new Error('datatable must have a columns array, even if it is empty');
    }

    if (!table.rows) {
      throw new Error('datatable must have a rows array, even if it is empty');
    }
  },
  serialize: table => {
    const { columns, rows } = table;
    return {
      ...table,
      rows: rows.map(row => {
        return columns.map(column => row[column.name]);
      }),
    };
  },
  deserialize: table => {
    const { columns, rows } = table;
    return {
      ...table,
      rows: rows.map(row => {
        return zipObject(map(columns, 'name'), row);
      }),
    };
  },
  from: {
    null: () => ({
      type: name,
      rows: [],
      columns: [],
    }),
    pointseries: (value: PointSeries) => ({
      type: name,
      rows: value.rows,
      columns: map(value.columns, (val, colName) => {
        return { name: colName!, type: val.type };
      }),
    }),
  },
  to: {
    render: (table): Render<RenderedDatatable> => ({
      type: 'render',
      as: 'table',
      value: {
        datatable: table,
        paginate: true,
        perPage: 10,
        showHeader: true,
      },
    }),
    pointseries: (table: Datatable): PointSeries => {
      const validFields = ['x', 'y', 'color', 'size', 'text'];
      const columns = table.columns.filter(column => validFields.includes(column.name));
      const rows = table.rows.map(row => pick(row, validFields));
      return {
        type: 'pointseries',
        columns: columns.reduce<Record<string, PointSeries['columns']>>((acc, column) => {
          acc[column.name] = {
            type: column.type,
            expression: column.name,
            role: 'dimension',
          };
          return acc;
        }, {}),
        rows,
      };
    },
  },
});
