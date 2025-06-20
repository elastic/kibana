/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { ColorMode, CustomPaletteState } from '@kbn/charts-plugin/common';
import type {
  LegacyMetricAlignment,
  LegacyMetricLabelsConfig,
  LegacyMetricStyle,
} from '@kbn/visualizations-plugin/common';

export const visType = 'metric';

export interface DimensionsVisParam {
  metrics: Array<ExpressionValueVisDimension | string>;
  bucket?: ExpressionValueVisDimension | string;
}

export interface MetricVisParam {
  autoScaleMetricAlignment?: LegacyMetricAlignment;
  percentageMode: boolean;
  percentageFormatPattern?: string;
  metricColorMode: ColorMode;
  palette?: CustomPaletteState;
  labels: LegacyMetricLabelsConfig;
  style: LegacyMetricStyle;
  colorFullBackground: boolean;
  autoScale?: boolean;
}

export interface VisParams {
  addTooltip: boolean;
  addLegend: boolean;
  dimensions: DimensionsVisParam;
  metric: MetricVisParam;
  type: typeof visType;
}

export interface MetricOptions {
  value: string;
  label: string;
  color?: string;
  bgColor?: string;
  lightText: boolean;
  colIndex: number;
  rowIndex: number;
}
