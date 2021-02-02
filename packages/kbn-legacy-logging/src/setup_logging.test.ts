/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Server } from '@hapi/hapi';
import { reconfigureLogging, setupLogging } from './setup_logging';
import { LegacyLoggingConfig } from './schema';

describe('reconfigureLogging', () => {
  test(`doesn't throw an error`, () => {
    const server = new Server();
    const config: LegacyLoggingConfig = {
      silent: false,
      quiet: false,
      verbose: true,
      events: {},
      dest: '/tmp/foo',
      filter: {},
      json: true,
      rotate: {
        enabled: false,
        everyBytes: 0,
        keepFiles: 0,
        pollingInterval: 0,
        usePolling: false,
      },
    };
    setupLogging(server, config, 10);
    reconfigureLogging(server, { ...config, dest: '/tmp/bar' }, 0);
  });
});
