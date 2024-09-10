/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ExpressionFunctionDefinition,
  ExpressionValueRender,
  Style,
} from '@kbn/expressions-plugin/common';

export type Input = number | string | null;

export interface Arguments {
  label: string;
  metricFont: Style;
  metricFormat: string;
  labelFont: Style;
}

export type ExpressionMetricFunction = () => ExpressionFunctionDefinition<
  'metric',
  Input,
  Arguments,
  ExpressionValueRender<Arguments>
>;
