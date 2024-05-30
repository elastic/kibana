/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
import { set } from '@kbn/safer-lodash-set';
import { PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';

export type Result = 'ready';

(async () => {
  if (!process.send) {
    throw new Error('worker must be run in a node.js fork');
  }

  const settings = {
    logging: {
      loggers: [{ name: 'root', level: 'info', appenders: ['console'] }],
    },
    server: {
      port: 5622,
      oas: {
        enabled: true,
      },
    },
  };
  set(settings, PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH, true);

  const root = createRootWithCorePlugins(settings, {
    basePath: false,
    cache: false,
    dev: true,
    disableOptimizer: true,
    silent: false,
    dist: false,
    oss: false,
    runExamples: false,
    watch: false,
  });

  await root.preboot();
  await root.setup();
  await root.start();

  const result: Result = 'ready';

  process.send(result);
})().catch((error) => {
  process.stderr.write(`UNHANDLED ERROR: ${error.stack}`);
  process.exit(1);
});
