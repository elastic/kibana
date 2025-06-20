/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Datatable,
  DefaultInspectorAdapters,
  ExecutionContext,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '@kbn/expressions-plugin/common';
import type {
  MetricTrendlineResult,
  MetricTrendlineArguments,
  MetricArguments,
} from '@kbn/visualizations-plugin/common';
import type { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import { VisParams, visType } from './expression_renderers';
import { EXPRESSION_METRIC_NAME, EXPRESSION_METRIC_TRENDLINE_NAME } from '../constants';

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

export type TrendlineExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_METRIC_TRENDLINE_NAME,
  MetricInput,
  MetricTrendlineArguments,
  MetricTrendlineResult
>;
