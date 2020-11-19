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

import { getFormatService } from '../../../services';
import { Aspect } from './point_series';
import { Table, Row } from '../../types';

type RowValue = number | string | object | 'NaN';
interface Raw {
  table: Table;
  column: number | undefined;
  row: number | undefined;
  value?: RowValue;
}
export interface Point {
  x: RowValue | '_all';
  y: RowValue;
  z?: RowValue;
  extraMetrics: [];
  seriesRaw?: Raw;
  xRaw: Raw;
  yRaw: Raw;
  zRaw?: Raw;
  tableRaw?: {
    table: Table;
    column: number;
    row: number;
    value: number;
    title: string;
  };
  parent: Aspect | null;
  series?: string;
  seriesId?: string;
}
export function getPoint(
  table: Table,
  x: Aspect,
  series: Aspect[] | undefined,
  row: Row,
  rowIndex: number,
  y: Aspect,
  z?: Aspect
): Point | undefined {
  const xRow = x.accessor === -1 ? '_all' : row[x.accessor];
  const yRow = row[y.accessor];
  const zRow = z && row[z.accessor];

  const point: Point = {
    x: xRow,
    y: yRow,
    z: zRow,
    extraMetrics: [],
    seriesRaw: series && {
      table,
      column: series[0].column,
      row: rowIndex,
      value: row[series[0].accessor],
    },
    xRaw: {
      table,
      column: x.column,
      row: rowIndex,
      value: xRow,
    },
    yRaw: {
      table,
      column: y.column,
      row: rowIndex,
      value: yRow,
    },
    zRaw: z && {
      table,
      column: z.column,
      row: rowIndex,
      value: zRow,
    },
    tableRaw: table.$parent && {
      table: table.$parent.table,
      column: table.$parent.column,
      row: table.$parent.row,
      value: table.$parent.key,
      title: table.$parent.name,
    },
    parent: series ? series[0] : null,
  };

  if (point.y === 'NaN') {
    // filter out NaN from stats
    // from metrics that are not based at zero
    return;
  }

  if (series) {
    point.series = series
      .map((s) => {
        const fieldFormatter = getFormatService().deserialize(s.format);
        return fieldFormatter.convert(row[s.accessor]);
      })
      .join(' - ');
  } else if (y) {
    // If the data is not split up with a series aspect, then
    // each point's "series" becomes the y-agg that produced it
    point.series = y.title;
  }

  return point;
}
