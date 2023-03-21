/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteOutput } from '@kbn/coloring';
import { LayoutDirection, MetricWTrend } from '@elastic/charts';
import {
  Datatable,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension, prepareLogTable } from '@kbn/visualizations-plugin/common';
import { CustomPaletteState } from '@kbn/charts-plugin/common';
import { VisParams, visType } from './expression_renderers';
import { EXPRESSION_METRIC_NAME, EXPRESSION_METRIC_TRENDLINE_NAME } from '../constants';

export interface MetricArguments {
  metric: ExpressionValueVisDimension | string;
  secondaryMetric?: ExpressionValueVisDimension | string;
  max?: ExpressionValueVisDimension | string;
  breakdownBy?: ExpressionValueVisDimension | string;
  trendline?: TrendlineResult;
  subtitle?: string;
  secondaryPrefix?: string;
  progressDirection: LayoutDirection;
  color?: string;
  palette?: PaletteOutput<CustomPaletteState>;
  maxCols: number;
  minTiles?: number;
  inspectorTableId: string;
}

export type MetricInput = Datatable;

export interface MetricVisRenderConfig {
  visType: typeof visType;
  visData: Datatable;
  visConfig: Pick<VisParams, 'metric' | 'dimensions'>;
}

export type MetricVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_METRIC_NAME,
  MetricInput,
  MetricArguments,
  ExpressionValueRender<MetricVisRenderConfig>
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
