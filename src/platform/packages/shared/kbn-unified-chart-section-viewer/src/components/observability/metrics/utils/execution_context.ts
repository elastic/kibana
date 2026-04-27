/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import type {
  MetricsExecutionContextAction,
  MetricsExecutionContextName,
} from './execution_context_enums';

/**
 * Naming convention for metrics profile execution context labels in APM.
 * Returns options suitable for spreading into search calls. Pass enum values from constants.ts, e.g. getMetricsExecutionContext(MetricsExecutionContextAction.FETCH, MetricsExecutionContextName.METRICS_INFO).
 */
export const getMetricsExecutionContext = (
  action: MetricsExecutionContextAction,
  name: MetricsExecutionContextName
) => ({
  executionContext: { page: `metrics_${action}_${name}` } as KibanaExecutionContext,
});
