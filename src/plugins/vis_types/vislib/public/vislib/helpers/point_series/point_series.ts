/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Duration } from 'moment';

import type { Dimension, Dimensions } from '@kbn/vis-type-xy-plugin/public';
import type { DateHistogramParams, HistogramParams } from '@kbn/visualizations-plugin/public';

import { getSeries } from './_get_series';
import { getAspects } from './_get_aspects';
import { initYAxis } from './_init_y_axis';
import { initXAxis } from './_init_x_axis';
import { orderedDateAxis } from './_ordered_date_axis';
import { Serie } from './_add_to_siri';
import { Column, Table } from '../../types';

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
