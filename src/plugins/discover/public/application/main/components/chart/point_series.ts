/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import { Duration, Moment } from 'moment';
import { Unit } from '@kbn/datemath';
import { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';

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

export interface HistogramParamsBounds {
  min: Moment;
  max: Moment;
}

interface HistogramParams {
  date: true;
  interval: Duration;
  intervalESValue: number;
  intervalESUnit: Unit;
  format: string;
  bounds: HistogramParamsBounds;
}
export interface Dimension {
  accessor: 0 | 1;
  format: SerializedFieldFormat<{ pattern: string }>;
  label: string;
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
  yAxisFormat: Dimension['format'];
  xAxisLabel: Column['name'];
  yAxisLabel?: Column['name'];
  ordered: Ordered;
}

export const buildPointSeriesData = (table: Table, dimensions: Dimensions): Chart => {
  const { x, y } = dimensions;
  const xAccessor = table.columns[x.accessor].id;
  const yAccessor = table.columns[y.accessor].id;
  const chart = {} as Chart;

  chart.xAxisOrderedValues = uniq(table.rows.map((r) => r[xAccessor] as number));
  chart.xAxisFormat = x.format;
  chart.xAxisLabel = table.columns[x.accessor].name;
  chart.yAxisFormat = y.format;
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
