/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PLUGIN_ID = 'expressionMetricVis';
export const PLUGIN_NAME = 'expressionMetricVis';

export type {
  MetricArguments,
  MetricInput,
  MetricVisRenderConfig,
  MetricVisExpressionFunctionDefinition,
  TrendlineExpressionFunctionDefinition,
  DimensionsVisParam,
  MetricVisParam,
  VisParams,
  MetricOptions,
  AvailableMetricIcon,
} from './types';

export { metricVisFunction } from './expression_functions';

export { EXPRESSION_METRIC_NAME, EXPRESSION_METRIC_TRENDLINE_NAME } from './constants';
