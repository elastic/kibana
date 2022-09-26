/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { CustomPaletteState } from '@kbn/charts-plugin/common';
import { LayoutDirection } from '@elastic/charts';
import { TrendlineResult } from './expression_functions';

export const visType = 'metric';

export interface DimensionsVisParam {
  metric: ExpressionValueVisDimension | string;
  secondaryMetric?: ExpressionValueVisDimension | string;
  max?: ExpressionValueVisDimension | string;
  breakdownBy?: ExpressionValueVisDimension | string;
}

export interface MetricVisParam {
  subtitle?: string;
  secondaryPrefix?: string;
  color?: string;
  palette?: CustomPaletteState;
  progressDirection: LayoutDirection;
  maxCols: number;
  minTiles?: number;
  trends?: TrendlineResult['trends'];
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
