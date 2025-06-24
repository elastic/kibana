/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PLUGIN_ID = 'expressionLegacyMetricVis';
export const PLUGIN_NAME = 'expressionLegacyMetricVis';

export type {
  MetricArguments,
  MetricInput,
  MetricVisRenderConfig,
  MetricVisExpressionFunctionDefinition,
  DimensionsVisParam,
  MetricVisParam,
  VisParams,
  MetricOptions,
} from './types';

export { metricVisFunction } from './expression_functions';

export { EXPRESSION_METRIC_NAME } from './constants';
