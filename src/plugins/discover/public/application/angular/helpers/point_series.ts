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

import { uniq } from 'lodash';
import { Duration, Moment } from 'moment';
import { Unit } from '@elastic/datemath';

import { SerializedFieldFormat } from '../../../../../expressions/common/types';

export interface Column {
  id: string;
  name: string;
}

export interface Row {
  [key: string]: number | 'NaN';
}

export interface Table {
  columns: Column[];
  rows: Row[];
}

interface HistogramParams {
  date: true;
  interval: Duration;
  intervalESValue: number;
  intervalESUnit: Unit;
  format: string;
  bounds: {
    min: Moment;
    max: Moment;
  };
}
export interface Dimension {
  accessor: 0 | 1;
  format: SerializedFieldFormat<{ pattern: string }>;
}

export interface Dimensions {
  x: Dimension & { params: HistogramParams };
  y: Dimension;
}

interface Ordered {
  date: true;
  interval: Duration;
  intervalESUnit: string;
  intervalESValue: number;
  min: Moment;
  max: Moment;
}
export interface Chart {
  values: Array<{
    x: number;
    y: number;
  }>;
  xAxisOrderedValues: number[];
  xAxisFormat: Dimension['format'];
  xAxisLabel: Column['name'];
  yAxisLabel?: Column['name'];
  ordered: Ordered;
}

export const buildPointSeriesData = (table: Table, dimensions: Dimensions) => {
  const { x, y } = dimensions;
  const xAccessor = table.columns[x.accessor].id;
  const yAccessor = table.columns[y.accessor].id;
  const chart = {} as Chart;

  chart.xAxisOrderedValues = uniq(table.rows.map((r) => r[xAccessor] as number));
  chart.xAxisFormat = x.format;
  chart.xAxisLabel = table.columns[x.accessor].name;

  const { intervalESUnit, intervalESValue, interval, bounds } = x.params;
  chart.ordered = {
    date: true,
    interval,
    intervalESUnit,
    intervalESValue,
    min: bounds.min,
    max: bounds.max,
  };

  chart.yAxisLabel = table.columns[y.accessor].name;

  chart.values = table.rows
    .filter((row) => row && row[yAccessor] !== 'NaN')
    .map((row) => ({
      x: row[xAccessor] as number,
      y: row[yAccessor] as number,
    }));

  return chart;
};
