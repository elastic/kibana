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
import moment, { Duration } from 'moment';

import { getSeries } from './_get_series';
import { getAspects } from './_get_aspects';
import { Serie } from './_add_to_siri';

export interface Column {
  id: string;
  name: string;
}

export interface Row {
  [key: string]: number | string;
}

export interface Table {
  columns: Column[];
  rows: Row[];
  $parent: {
    table: Table;
    column: number;
    row: number;
    key: number;
    name: string;
  };
}

interface DateParams {
  date: true;
  interval: Duration;
  intervalESValue: number;
  intervalESUnit: string;
  format: string;
  bounds?: {
    min: string | number;
    max: string | number;
  };
}
export interface Dimension {
  accessor: number;
  format: {
    id?: string;
    params?: { pattern?: string; [key: string]: any };
  };
  params?: DateParams;
}

export interface Dimensions {
  x: Dimension;
  y: Dimension;
}
export interface Aspect {
  accessor: Column['id'];
  column?: Dimension['accessor'];
  title: Column['name'];
  format: Dimension['format'];
  params: Dimension['params'];
}
export interface Aspects {
  x: Aspect[];
  y: Aspect[];
}
interface Ordered {
  date: true;
  interval: Duration;
  intervalESUnit: string;
  intervalESValue: number;
  min?: number;
  max?: number;
}
export interface Chart {
  aspects: Aspects;
  series: Serie[];
  xAxisOrderedValues?: Array<string | number>;
  xAxisFormat?: Dimension['format'];
  xAxisLabel?: Column['name'];
  yAxisLabel?: Column['name'];
  ordered: Ordered;
}

export const buildPointSeriesData = (table: Table, dimensions: Dimensions) => {
  const chart: Chart = {
    aspects: getAspects(table, dimensions),
  } as Chart;

  const { format, title, params, accessor } = chart.aspects.x[0];
  chart.xAxisOrderedValues = uniq(table.rows.map(r => r[accessor]));
  chart.xAxisFormat = format;
  chart.xAxisLabel = title;

  const { intervalESUnit, intervalESValue, interval, bounds } = params as DateParams;
  chart.ordered = {
    interval: moment.duration(interval),
    intervalESUnit,
    intervalESValue,
    date: true,
  };

  if (bounds) {
    chart.ordered.min = isNaN(bounds.min as number)
      ? Date.parse(bounds.min as string)
      : (bounds.min as number);
    chart.ordered.max = isNaN(bounds.max as number)
      ? Date.parse(bounds.max as string)
      : (bounds.max as number);
  }

  const { y } = chart.aspects;
  chart.yAxisLabel = y.length > 1 ? '' : y[0].title;

  chart.series = getSeries(table, chart);

  delete chart.aspects;
  return chart;
};
