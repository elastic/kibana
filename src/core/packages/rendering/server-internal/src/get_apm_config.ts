/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getConfiguration, shouldInstrumentClient } from '@kbn/apm-config-loader';
import { tracingApi } from '@kbn/tracing';
import type { AgentConfigOptions } from '@kbn/telemetry-config';

const OMIT_APM_CONFIG: Array<keyof AgentConfigOptions> = [
  'secretToken',
  'apiKey',
  'captureSpanStackTraces',
  'metricsInterval',
];

export const getApmConfig = (requestPath: string) => {
  const baseConfig = getConfiguration('kibana-frontend') || {};

  // Omit configs not used by RUM agent.
  OMIT_APM_CONFIG.forEach((config) => {
    delete baseConfig[config];
  });

  if (!shouldInstrumentClient(baseConfig)) {
    return null;
  }

  // Cleanup RUM unsupported attrbiutes from base apm config.
  const { contextPropagationOnly, ...restOfConfig } = baseConfig;
  const config: Record<string, any> = {
    ...restOfConfig,
    pageLoadTransactionName: requestPath,
  };

  // Get current active backend transaction to make distributed tracing
  // work for rendering the app
  const backendTransaction = tracingApi?.legacy.currentTransaction;

  if (backendTransaction) {
    const traceId = tracingApi?.legacy.currentTraceIds['trace.id'];
    const pageLoadParentId = tracingApi?.legacy.currentTraceIds['span.id'];

    const sampled = tracingApi?.legacy.currentSpan?.spanContext().traceFlags;

    return {
      ...config,
      pageLoadTraceId: traceId,
      pageLoadSampled: sampled,
      pageLoadParentId,
    };
  }

  return config;
};
