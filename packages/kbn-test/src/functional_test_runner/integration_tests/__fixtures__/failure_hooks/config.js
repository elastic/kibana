/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';

export default function () {
  return {
    testFiles: [
      require.resolve('./tests/before_hook'),
      require.resolve('./tests/it'),
      require.resolve('./tests/after_hook'),
    ],
    services: {
      hookIntoLIfecycle({ getService }) {
        const log = getService('log');
        const lifecycle = getService('lifecycle');

        lifecycle.testFailure.add(async (err, test) => {
          log.info('testFailure %s %s', err.message, test.fullTitle());
          await setTimeoutAsync(10);
          log.info('testFailureAfterDelay %s %s', err.message, test.fullTitle());
        });

        lifecycle.testHookFailure.add(async (err, test) => {
          log.info('testHookFailure %s %s', err.message, test.fullTitle());
          await setTimeoutAsync(10);
          log.info('testHookFailureAfterDelay %s %s', err.message, test.fullTitle());
        });
      },
    },
    mochaReporter: {
      captureLogOutput: false,
      sendToCiStats: false,
    },
    servers: {
      elasticsearch: {
        port: 1234,
      },
    },
  };
}
