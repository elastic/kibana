/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Theme } from '@kbn/charts-plugin/public/plugin';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { Duration, Moment } from 'moment';
import type { Unit } from '@kbn/datemath';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';

export type UnifiedHistogramFetchStatus =
  | 'uninitialized'
  | 'loading'
  | 'partial'
  | 'complete'
  | 'error';

export interface UnifiedHistogramServices {
  data: DataPublicPluginStart;
  theme: Theme;
  uiSettings: IUiSettingsClient;
  fieldFormats: FieldFormatsStart;
}

interface Column {
  id: string;
  name: string;
}

interface Row {
  [key: string]: number | 'NaN';
}

interface Dimension {
  accessor: 0 | 1;
  format: SerializedFieldFormat<{ pattern: string }>;
  label: string;
}

interface Ordered {
  date: true;
  interval: Duration;
  intervalESUnit: string;
  intervalESValue: number;
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

export interface HistogramParamsBounds {
  min: Moment;
  max: Moment;
}

export interface Table {
  columns: Column[];
  rows: Row[];
}

export interface Dimensions {
  x: Dimension & { params: HistogramParams };
  y: Dimension;
}

export interface UnifiedHistogramChartData {
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

export interface UnifiedHistogramBucketInterval {
  scaled?: boolean;
  description?: string;
  scale?: number;
}

export interface UnifiedHistogramHitsContext {
  status: UnifiedHistogramFetchStatus;
  number?: number;
}

export interface UnifiedHistogramChartContext {
  status: UnifiedHistogramFetchStatus;
  hidden?: boolean;
  timeInterval?: string;
  bucketInterval?: UnifiedHistogramBucketInterval;
  data?: UnifiedHistogramChartData;
  error?: Error;
}
