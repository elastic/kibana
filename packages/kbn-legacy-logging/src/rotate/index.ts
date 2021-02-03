/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Server } from '@hapi/hapi';
import { LogRotator } from './log_rotator';
import { LegacyLoggingConfig } from '../schema';

let logRotator: LogRotator;

export async function setupLoggingRotate(server: Server, config: LegacyLoggingConfig) {
  // If log rotate is not enabled we skip
  if (!config.rotate.enabled) {
    return;
  }

  // We don't want to run logging rotate server if
  // we are not logging to a file
  if (config.dest === 'stdout') {
    server.log(
      ['warning', 'logging:rotate'],
      'Log rotation is enabled but logging.dest is configured for stdout. Set logging.dest to a file for this setting to take effect.'
    );
    return;
  }

  // Enable Logging Rotate Service
  // We need the master process and it can
  // try to setupLoggingRotate more than once,
  // so we'll need to assure it only loads once.
  if (!logRotator) {
    logRotator = new LogRotator(config, server);
    await logRotator.start();
  }

  return logRotator;
}
