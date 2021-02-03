/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getConfig } from '../../../apm';
import agent from 'elastic-apm-node';

const apmEnabled = getConfig()?.active;

export function getApmConfig(requestPath) {
  if (!apmEnabled) {
    return null;
  }
  const config = {
    ...getConfig('kibana-frontend'),
    pageLoadTransactionName: requestPath,
  };

  /**
   * Get current active backend transaction to make distrubuted tracing
   * work for rendering the app
   */
  const backendTransaction = agent.currentTransaction;

  if (backendTransaction) {
    const { sampled, traceId } = backendTransaction;
    return {
      ...config,
      ...{
        pageLoadTraceId: traceId,
        pageLoadSampled: sampled,
        pageLoadSpanId: backendTransaction.ensureParentId(),
      },
    };
  }
  return config;
}
