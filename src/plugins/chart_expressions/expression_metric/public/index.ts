/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExpressionMetricPlugin } from './plugin';

export function plugin() {
  return new ExpressionMetricPlugin();
}

export { getDataBoundsForPalette } from './utils';
export { EXPRESSION_METRIC_NAME, EXPRESSION_METRIC_TRENDLINE_NAME } from '../common';
