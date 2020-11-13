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

import { ExpressionTypeDefinition } from '../types';
import { PointSeries, PointSeriesColumn } from './pointseries';
import { ExpressionValueRender } from './render';
import { SerializedFieldFormat } from '../../types';

type State = string | number | boolean | null | undefined | SerializableState;

/** @internal **/
export interface SerializableState {
  [key: string]: State | State[];
}

const name = 'datatable';

/**
 * A Utility function that Typescript can use to determine if an object is a Datatable.
 * @param datatable
 */
export const isDatatable = (datatable: unknown): datatable is Datatable =>
  !!datatable && typeof datatable === 'object' && (datatable as any).type === 'datatable';

/**
 * This type represents the `type` of any `DatatableColumn` in a `Datatable`.
 * its duplicated from KBN_FIELD_TYPES
 */
export type DatatableColumnType =
  | '_source'
  | 'attachment'
  | 'boolean'
  | 'date'
  | 'geo_point'
  | 'geo_shape'
  | 'ip'
  | 'murmur3'
  | 'number'
  | 'string'
  | 'unknown'
  | 'conflict'
  | 'object'
  | 'nested'
  | 'histogram'
  | 'null';

/**
 * This type represents a row in a `Datatable`.
 */
export type DatatableRow = Record<string, any>;

/**
 * Datatable column meta information
 */
export interface DatatableColumnMeta {
  type: DatatableColumnType;
  /**
   * field this column is based on
   */
  field?: string;
  /**
   * index/table this column is based on
   */
  index?: string;
  /**
   * serialized field format
   */
  params?: SerializedFieldFormat;
  /**
   * source function that produced this column
   */
  source?: string;
  /**
   * any extra parameters for the source that produced this column
   */
  sourceParams?: SerializableState;
}

/**
 * This type represents the shape of a column in a `Datatable`.
 */
export interface DatatableColumn {
  id: string;
  name: string;
  meta: DatatableColumnMeta;
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

export const datatable: ExpressionTypeDefinition<typeof name, Datatable, SerializedDatatable> = {
  name,
  validate: (table) => {
    // TODO: Check columns types. Only string, boolean, number, date, allowed for now.
    if (!table.columns) {
      throw new Error('datatable must have a columns array, even if it is empty');
    }

    if (!table.rows) {
      throw new Error('datatable must have a rows array, even if it is empty');
    }
  },
  serialize: (table) => {
    const { columns, rows } = table;
    return {
      ...table,
      rows: rows.map((row) => {
        return columns.map((column) => row[column.name]);
      }),
    };
  },
  deserialize: (table) => {
    const { columns, rows } = table;
    return {
      ...table,
      rows: rows.map((row) => {
        return zipObject(map(columns, 'name'), row);
      }),
    };
  },
  from: {
    null: () => ({
      type: name,
      meta: {},
      rows: [],
      columns: [],
    }),
    pointseries: (value: PointSeries) => ({
      type: name,
      meta: {},
      rows: value.rows,
      columns: map(value.columns, (val: PointSeriesColumn, colName) => {
        return { id: colName, name: colName, meta: { type: val.type } };
      }),
    }),
  },
  to: {
    render: (table): ExpressionValueRender<RenderedDatatable> => ({
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
      const columns = table.columns.filter((column) => validFields.includes(column.id));
      const rows = table.rows.map((row) => pick(row, validFields));
      return {
        type: 'pointseries',
        columns: columns.reduce<Record<string, PointSeries['columns']>>((acc, column) => {
          acc[column.name] = {
            type: column.meta.type,
            expression: column.name,
            role: 'dimension',
          };
          return acc;
        }, {}),
        rows,
      };
    },
  },
};
