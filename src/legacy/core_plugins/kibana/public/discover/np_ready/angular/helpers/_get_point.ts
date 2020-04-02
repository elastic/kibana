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

import { Aspect, Table, Row } from './point_series';

type RowValue = number | 'NaN';
interface Raw {
  table: Table;
  column: number;
  row: number;
  value: RowValue;
}
export interface Point {
  x: RowValue | '_all';
  y: RowValue;
  extraMetrics: [];
  xRaw: Raw;
  yRaw: Raw;
  tableRaw?: {
    table: Table;
    column: number;
    row: number;
    value: number;
    title: string;
  };
  parent: null;
  series?: string;
  seriesId?: string;
}

export function getPoint(table: Table, x: Aspect, row: Row, rowIndex: number, y: Aspect) {
  const xRow = row[x.accessor];
  const yRow = row[y.accessor];

  const point = {
    x: xRow,
    y: yRow,
    extraMetrics: [],
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
    tableRaw: table.$parent && {
      table: table.$parent.table,
      column: table.$parent.column,
      row: table.$parent.row,
      value: table.$parent.key,
      title: table.$parent.name,
    },
    parent: null,
  } as Point;

  if (point.y === 'NaN') {
    // filter out NaN from stats
    // from metrics that are not based at zero
    return;
  }

  if (y) {
    // If the data is not split up with a series aspect, then
    // each point's "series" becomes the y-agg that produced it
    point.series = y.title;
  }

  return point;
}
