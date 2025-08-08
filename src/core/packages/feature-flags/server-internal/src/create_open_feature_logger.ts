/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger as OpenFeatureLogger } from '@openfeature/server-sdk';
import type { Logger, LogMeta } from '@kbn/logging';

interface LogMetaWithExtraArguments extends LogMeta {
  extraArguments: unknown[];
}

function normalizeLogArguments(
  logger: Logger,
  logLevel: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  ...args: unknown[]
) {
  // Special case when calling log('something went wrong', error)
  if (args.length === 1 && args[0] instanceof Error) {
    logger[logLevel](message, { error: args[0] });
  } else {
    logger[logLevel]<LogMetaWithExtraArguments>(message, { extraArguments: args });
  }
}

/**
 * The way OpenFeature logs messages is very similar to the console.log approach,
 * which is not compatible with our LogMeta approach. This can result in our log removing information like any 3rd+
 * arguments passed or the error.message when using log('message', error).
 *
 * This wrapper addresses this by making it ECS-compliant.
 * @param logger The Kibana logger
 */
export function createOpenFeatureLogger(logger: Logger): OpenFeatureLogger {
  return {
    debug: (message: string, ...args: unknown[]) =>
      normalizeLogArguments(logger, 'debug', message, ...args),
    info: (message: string, ...args: unknown[]) =>
      normalizeLogArguments(logger, 'info', message, ...args),
    warn: (message: string, ...args: unknown[]) =>
      normalizeLogArguments(logger, 'warn', message, ...args),
    error: (message: string, ...args: unknown[]) =>
      normalizeLogArguments(logger, 'error', message, ...args),
  };
}
