/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { $Values } from '@kbn/utility-types';
import type {
  ExpressionValueVisDimension,
  InspectorLogTable,
} from '@kbn/visualizations-plugin/common';
import { LayoutDirection, MetricStyle, MetricWTrend } from '@elastic/charts';
import { PaletteOutput } from '@kbn/coloring';
import { CustomPaletteState } from '@kbn/charts-plugin/common';
import { EXPRESSION_METRIC_TRENDLINE_NAME, METRIC_AVAILABLE_METRIC_ICONS } from './constants';

export type AvailableMetricIcon = $Values<typeof METRIC_AVAILABLE_METRIC_ICONS>;

export interface MetricTrendlineResult {
  type: typeof EXPRESSION_METRIC_TRENDLINE_NAME;
  trends: Record<string, MetricWTrend['trend']>;
  inspectorTable: InspectorLogTable;
  inspectorTableId: string;
}

export interface MetricArguments {
  metric: ExpressionValueVisDimension | string;
  secondaryMetric?: ExpressionValueVisDimension | string;
  max?: ExpressionValueVisDimension | string;
  breakdownBy?: ExpressionValueVisDimension | string;
  trendline?: MetricTrendlineResult;
  subtitle?: string;
  secondaryPrefix?: string;
  secondaryColor?: string;
  secondaryTrendVisuals?: string;
  secondaryTrendBaseline?: number | string;
  secondaryTrendPalette?: [string, string, string];
  progressDirection?: LayoutDirection;
  titlesTextAlign: MetricStyle['titlesTextAlign'];
  valuesTextAlign: MetricStyle['valuesTextAlign'];
  iconAlign: MetricStyle['iconAlign'];
  valueFontSize: MetricStyle['valueFontSize'];
  color?: string;
  icon?: string;
  palette?: PaletteOutput<CustomPaletteState>;
  maxCols: number;
  minTiles?: number;
  inspectorTableId: string;
}
