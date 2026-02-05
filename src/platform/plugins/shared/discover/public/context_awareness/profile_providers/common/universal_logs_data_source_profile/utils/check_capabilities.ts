/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';

/**
 * Checks which O11y-related capabilities are available in the current deployment
 * This allows the profile to gracefully degrade in environments like ES3
 */
export interface LogsCapabilities {
  hasStreams: boolean;
  hasApm: boolean;
  hasSlo: boolean;
  hasObservability: boolean;
}

/**
 * Detects available capabilities by checking if apps exist
 */
export const checkLogsCapabilities = (core: CoreStart): LogsCapabilities => {
  const { application } = core;
  
  // Check if apps are available/registered
  const capabilities: LogsCapabilities = {
    // Streams is available in O11y, Security, and Classic
    hasStreams: application.capabilities.streams?.show === true,
    
    // APM is available in O11y solution
    hasApm: application.capabilities.apm?.show === true,
    
    // SLO is available in O11y solution
    hasSlo: application.capabilities.slo?.show === true,
    
    // Check if observability solution exists
    hasObservability: application.capabilities.observability?.show === true,
  };
  
  // eslint-disable-next-line no-console
  console.log('[Universal Logs Profile] Detected capabilities:', capabilities);
  
  return capabilities;
};
