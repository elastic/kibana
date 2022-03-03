/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import {
  ColorMode,
  Labels,
  CustomPaletteState,
  Style as ChartStyle,
} from '../../../../charts/common';
import { Style } from '../../../../expressions/common';
import { LabelPosition } from '../constants';

export const visType = 'metric';

export interface DimensionsVisParam {
  metrics: Array<ExpressionValueVisDimension | string>;
  bucket?: ExpressionValueVisDimension | string;
}

export type LabelPositionType = $Values<typeof LabelPosition>;

export type MetricStyle = Style & Pick<ChartStyle, 'bgColor' | 'labelColor'>;

export type LabelsConfig = Labels & { style: Style; position: LabelPositionType };
export interface MetricVisParam {
  percentageMode: boolean;
  percentageFormatPattern?: string;
  metricColorMode: ColorMode;
  palette?: CustomPaletteState;
  labels: LabelsConfig;
  style: MetricStyle;
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
}
