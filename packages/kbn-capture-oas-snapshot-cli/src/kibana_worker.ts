/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createRootWithCorePlugins,
  createTestServerlessInstances,
} from '@kbn/core-test-helpers-kbn-server';
import { set } from '@kbn/safer-lodash-set';
import { PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';
import { buildFlavourEnvArgName } from './common';

export type Result = 'ready';

(async () => {
  if (!process.send) {
    throw new Error('worker must be run in a node.js fork');
  }
  const buildFlavour = process.env[buildFlavourEnvArgName];
  if (!buildFlavour) throw new Error(`env arg ${buildFlavourEnvArgName} must be provided`);

  const serverless = buildFlavour === 'serverless';

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

  const cliArgs = {
    serverless,
    basePath: false,
    cache: false,
    dev: true,
    disableOptimizer: true,
    silent: false,
    dist: false,
    oss: false,
    runExamples: false,
    watch: false,
  };

  if (serverless) {
    // Satisfy spaces config for serverless:
    set(settings, 'xpack.spaces.allowFeatureVisibility', false);
    set(settings, 'xpack.spaces.allowSolutionVisibility', false);
    const { startKibana } = createTestServerlessInstances({
      kibana: { settings, cliArgs },
    });
    await startKibana();
  } else {
    const root = createRootWithCorePlugins(settings, cliArgs);
    await root.preboot();
    await root.setup();
    await root.start();
  }

  const result: Result = 'ready';

  process.send(result);
})().catch((error) => {
  process.stderr.write(`UNHANDLED ERROR: ${error.stack}`);
  process.exit(1);
});
