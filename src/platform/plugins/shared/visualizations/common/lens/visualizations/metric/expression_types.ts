/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { $Values } from '@kbn/utility-types';
import { LayoutDirection, MetricStyle, MetricWTrend } from '@elastic/charts';
import { PaletteOutput } from '@kbn/coloring';
import { CustomPaletteState } from '@kbn/charts-plugin/common';
import { Datatable } from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension, InspectorLogTable } from '../../..';
import { EXPRESSION_METRIC_TRENDLINE_NAME, LENS_METRIC_AVAILABLE_METRIC_ICONS } from './constants';

export type AvailableMetricIcon = $Values<typeof LENS_METRIC_AVAILABLE_METRIC_ICONS>;

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

export interface MetricTrendlineArguments {
  metric: ExpressionValueVisDimension | string;
  timeField: ExpressionValueVisDimension | string;
  breakdownBy?: ExpressionValueVisDimension | string;
  table: Datatable;
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
