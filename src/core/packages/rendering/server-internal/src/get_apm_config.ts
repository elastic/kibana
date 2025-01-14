/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import agent, { AgentConfigOptions } from 'elastic-apm-node';
import { getConfiguration, shouldInstrumentClient } from '@kbn/apm-config-loader';

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
  const backendTransaction = agent.currentTransaction;

  if (backendTransaction) {
    const { sampled, traceId } = backendTransaction as any;
    return {
      ...config,
      pageLoadTraceId: traceId,
      pageLoadSampled: sampled,
      pageLoadParentId:
        agent.currentSpan?.ids['span.id'] || agent.currentTransaction?.ids['transaction.id'],
    };
  }

  return config;
};
