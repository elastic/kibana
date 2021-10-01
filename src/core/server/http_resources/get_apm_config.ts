/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import agent from 'elastic-apm-node';
import { getConfiguration } from '@kbn/apm-config-loader';

export const getApmConfig = (requestPath: string) => {
  const baseConfig = getConfiguration('kibana-frontend');
  if (!baseConfig?.active) {
    return null;
  }

  const config: Record<string, any> = {
    ...baseConfig,
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
      pageLoadSpanId: backendTransaction.ensureParentId(),
    };
  }

  return config;
};
