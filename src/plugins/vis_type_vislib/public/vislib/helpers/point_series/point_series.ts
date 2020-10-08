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

import { Duration } from 'moment';
import { getSeries } from './_get_series';
import { getAspects } from './_get_aspects';
import { initYAxis } from './_init_y_axis';
import { initXAxis } from './_init_x_axis';
import { orderedDateAxis } from './_ordered_date_axis';
import { Serie } from './_add_to_siri';
import { Column, Table } from '../../types';

export interface DateHistogramParams {
  date: boolean;
  interval: string;
  intervalESValue: number;
  intervalESUnit: string;
  format: string;
  bounds?: {
    min: string | number;
    max: string | number;
  };
}
export interface HistogramParams {
  interval: number;
}
export interface FakeParams {
  defaultValue: string;
}
export interface Dimension {
  accessor: number;
  format: {
    id?: string;
    params?: { pattern?: string; [key: string]: any };
  };
  params: DateHistogramParams | HistogramParams | FakeParams | {};
}

export interface Dimensions {
  x: Dimension | null;
  y: Dimension[];
  z?: Dimension[];
  series?: Dimension | Dimension[];
}
export interface Aspect {
  accessor: Column['id'];
  column?: Dimension['accessor'];
  title: Column['name'];
  format: Dimension['format'];
  params: Dimension['params'];
}
export type Aspects = { x: Aspect[]; y: Aspect[] } & { [key in keyof Dimensions]?: Aspect[] };

export interface DateHistogramOrdered {
  interval: Duration;
  intervalESUnit: DateHistogramParams['intervalESUnit'];
  intervalESValue: DateHistogramParams['intervalESValue'];
}
export interface HistogramOrdered {
  interval: HistogramParams['interval'];
}

type Ordered = (DateHistogramOrdered | HistogramOrdered) & {
  date?: boolean;
  min?: number;
  max?: number;
  endzones?: boolean;
};

export interface Chart {
  aspects: Aspects;
  series: Serie[];
  xAxisOrderedValues?: Array<string | number | object>;
  xAxisFormat?: Dimension['format'];
  xAxisLabel?: Column['name'];
  yAxisFormat?: Dimension['format'];
  yAxisLabel?: Column['name'];
  zAxisFormat?: Dimension['format'];
  zAxisLabel?: Column['name'];
  ordered?: Ordered;
}

export type OrderedChart = Chart & { ordered: Ordered };

export const buildPointSeriesData = (table: Table, dimensions: Dimensions) => {
  const chart = {
    aspects: getAspects(table, dimensions),
  } as Chart;

  initXAxis(chart, table);
  initYAxis(chart);

  if ('date' in chart.aspects.x[0].params) {
    // initXAxis will turn `chart` into an `OrderedChart if it is a date axis`
    orderedDateAxis(chart as OrderedChart);
  }

  chart.series = getSeries(table, chart);

  // @ts-expect-error
  delete chart.aspects;
  return chart;
};
