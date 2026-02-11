/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PaletteOutput } from '@kbn/coloring';
import type {
  LayoutDirection,
  MetricStyle,
  MetricWTrend,
  SecondaryMetricProps,
} from '@elastic/charts';
import type { $Values } from '@kbn/utility-types';
import type {
  Datatable,
  DefaultInspectorAdapters,
  ExecutionContext,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '@kbn/expressions-plugin/common';
import type {
  AllowedChartOverrides,
  AllowedSettingsOverrides,
  CustomPaletteState,
} from '@kbn/charts-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { prepareLogTable } from '@kbn/visualizations-common';
import type { VisParams, visType } from './expression_renderers';
import type {
  EXPRESSION_METRIC_NAME,
  EXPRESSION_METRIC_TRENDLINE_NAME,
  AvailableMetricIcons,
} from '../constants';

export type AvailableMetricIcon = $Values<typeof AvailableMetricIcons>;

export interface MetricArguments {
  metric: ExpressionValueVisDimension | string;
  secondaryMetric?: ExpressionValueVisDimension | string;
  max?: ExpressionValueVisDimension | string;
  breakdownBy?: ExpressionValueVisDimension | string;
  trendline?: TrendlineResult;
  subtitle?: string;
  secondaryLabel?: string;
  secondaryColor?: string;
  secondaryTrendVisuals?: string;
  secondaryTrendBaseline?: number | string;
  secondaryTrendPalette?: [string, string, string];
  progressDirection?: LayoutDirection;
  titlesTextAlign: MetricStyle['titlesTextAlign'];
  primaryAlign: MetricStyle['valueTextAlign'];
  secondaryAlign: MetricStyle['extraTextAlign'];
  iconAlign: MetricStyle['iconAlign'];
  valueFontSize: MetricStyle['valueFontSize'];
  titleWeight: MetricStyle['titleWeight'];
  primaryPosition: MetricStyle['valuePosition'];
  color?: string;
  icon?: string;
  palette?: PaletteOutput<CustomPaletteState>;
  maxCols: number;
  minTiles?: number;
  inspectorTableId: string;
  secondaryLabelPosition: SecondaryMetricProps['labelPosition'];
  applyColorTo: 'background' | 'value';
}

export type MetricInput = Datatable;

export interface MetricVisRenderConfig {
  visType: typeof visType;
  visData: Datatable;
  visConfig: Pick<VisParams, 'metric' | 'dimensions'>;
  overrides?: AllowedSettingsOverrides & AllowedChartOverrides;
}

export type MetricVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_METRIC_NAME,
  MetricInput,
  MetricArguments,
  ExpressionValueRender<MetricVisRenderConfig>,
  ExecutionContext<DefaultInspectorAdapters>
>;

export interface TrendlineArguments {
  metric: ExpressionValueVisDimension | string;
  timeField: ExpressionValueVisDimension | string;
  breakdownBy?: ExpressionValueVisDimension | string;
  table: Datatable;
  inspectorTableId: string;
}

export interface TrendlineResult {
  type: typeof EXPRESSION_METRIC_TRENDLINE_NAME;
  trends: Record<string, MetricWTrend['trend']>;
  inspectorTable: ReturnType<typeof prepareLogTable>;
  inspectorTableId: string;
}

export type TrendlineExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_METRIC_TRENDLINE_NAME,
  Datatable,
  TrendlineArguments,
  TrendlineResult
>;
