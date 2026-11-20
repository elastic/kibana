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
 * Identifies the Metrics grid charts in the execution context passed to Lens,
 * so Lens XY overlay providers can tell them apart from other Discover charts.
 */
export const METRICS_GRID_EXECUTION_CONTEXT: Pick<KibanaExecutionContext, 'type' | 'name'> = {
  type: 'discover',
  name: 'metrics_grid',
};

/**
 * Returns execution context options for spreading into search calls.
 * When `meta` is provided it is forwarded to `executionContext.meta`,
 * which the server-side pipeline flattens onto the APM transaction as `kibana_meta_*` labels.
 */
export const getMetricsExecutionContext = (
  action: MetricsExecutionContextAction,
  name: MetricsExecutionContextName,
  meta?: KibanaExecutionContext['meta']
) => ({
  executionContext: {
    page: `metrics_${action}_${name}`,
    ...(meta ? { meta } : {}),
  } as KibanaExecutionContext,
});
