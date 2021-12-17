/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import {
  ColorMode,
  Labels,
  CustomPaletteState,
  Style as ChartStyle,
} from '../../../../charts/common';
import { Style } from '../../../../expressions/common';

export const visType = 'metric';

export interface DimensionsVisParam {
  metrics: ExpressionValueVisDimension[];
  bucket?: ExpressionValueVisDimension;
}

export type MetricStyle = Style & Pick<ChartStyle, 'bgColor' | 'labelColor'>;
export interface MetricVisParam {
  percentageMode: boolean;
  percentageFormatPattern?: string;
  metricColorMode: ColorMode;
  palette?: CustomPaletteState;
  labels: Labels;
  style: MetricStyle;
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
}
