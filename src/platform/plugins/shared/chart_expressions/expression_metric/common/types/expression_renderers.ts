/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { LayoutDirection, MetricStyle, SecondaryMetricProps } from '@elastic/charts';
import type { PaletteOutput } from '@kbn/coloring';
import type { TrendlineResult } from './expression_functions';

export const visType = 'metric';

export interface DimensionsVisParam {
  metric: ExpressionValueVisDimension | string;
  secondaryMetric?: ExpressionValueVisDimension | string;
  max?: ExpressionValueVisDimension | string;
  breakdownBy?: ExpressionValueVisDimension | string;
}

export interface MetricVisParam {
  subtitle?: string;
  secondaryLabel?: string;
  secondaryColor?: string;
  secondaryTrend: {
    visuals?: string;
    baseline?: number | string;
    palette?: [string, string, string];
  };
  color?: string;
  icon?: string;
  palette?: PaletteOutput<CustomPaletteState>;
  progressDirection?: LayoutDirection;
  titlesTextAlign: MetricStyle['titlesTextAlign'];
  primaryAlign: MetricStyle['valueTextAlign'];
  secondaryAlign: MetricStyle['extraTextAlign'];
  iconAlign: MetricStyle['iconAlign'];
  valueFontSize: MetricStyle['valueFontSize'];
  titleWeight: MetricStyle['titleWeight'];
  primaryPosition: MetricStyle['valuePosition'];
  maxCols: number;
  minTiles?: number;
  trends?: TrendlineResult['trends'];
  secondaryLabelPosition: SecondaryMetricProps['labelPosition'];
  /**
   * Determines where the metric color should be applied.
   * Only applies when the background chart is a panel.
   * - 'background': Applies the color to the metric's background area.
   * - 'value': Applies the color to the Primary Metric's value.
   */
  applyColorTo: 'background' | 'value';
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
