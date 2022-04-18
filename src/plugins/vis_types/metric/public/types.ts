/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Range } from '@kbn/expressions-plugin/public';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/public';
import { ColorMode, Labels, Style, ColorSchemas } from '@kbn/charts-plugin/public';

export const visType = 'metric';

export interface DimensionsVisParam {
  metrics: ExpressionValueVisDimension[];
  bucket?: ExpressionValueVisDimension;
}

export interface MetricVisParam {
  percentageMode: boolean;
  percentageFormatPattern?: string;
  useRanges: boolean;
  colorSchema: ColorSchemas;
  metricColorMode: ColorMode;
  colorsRange: Range[];
  labels: Labels;
  invertColors: boolean;
  style: Style;
}

export interface VisParams {
  addTooltip: boolean;
  addLegend: boolean;
  dimensions: DimensionsVisParam;
  metric: MetricVisParam;
  type: typeof visType;
}
