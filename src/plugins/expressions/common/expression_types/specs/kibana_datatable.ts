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

import { map } from 'lodash';
import { SerializedFieldFormat } from '../../types/common';
import { Datatable, PointSeries, PointSeriesColumn } from '.';

const name = 'kibana_datatable';

export interface KibanaDatatableColumnMeta {
  type: string;
  indexPatternId?: string;
  aggConfigParams?: Record<string, any>;
}

export interface KibanaDatatableColumn {
  id: string;
  name: string;
  meta?: KibanaDatatableColumnMeta;
  formatHint?: SerializedFieldFormat;
}

export interface KibanaDatatableRow {
  [key: string]: unknown;
}

export interface KibanaDatatable {
  type: typeof name;
  columns: KibanaDatatableColumn[];
  rows: KibanaDatatableRow[];
}

export const kibanaDatatable = {
  name,
  from: {
    datatable: (context: Datatable) => {
      return {
        type: name,
        rows: context.rows,
        columns: context.columns.map((column) => {
          return {
            id: column.name,
            name: column.name,
          };
        }),
      };
    },
    pointseries: (context: PointSeries) => {
      const columns = map(context.columns, (column: PointSeriesColumn, n) => {
        return { id: n, name: n, ...column };
      });
      return {
        type: name,
        rows: context.rows,
        columns,
      };
    },
  },
};
