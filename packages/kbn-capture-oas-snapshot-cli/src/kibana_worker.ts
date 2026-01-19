/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createRootWithCorePlugins,
  createServerlessKibana,
} from '@kbn/core-test-helpers-kbn-server';
import { set } from '@kbn/safer-lodash-set';
import type { Root } from '@kbn/core-root-server-internal';
import { PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';
import { buildFlavourEnvArgName, filtersJsonEnvArgName } from './common';

export type Result = string;

(async () => {
  if (!process.send) {
    throw new Error('worker must be run in a node.js fork');
  }
  const filtersString = process.env[filtersJsonEnvArgName];
  if (!filtersString) throw new Error(`env arg ${filtersJsonEnvArgName} must be provided`);
  const filters = JSON.parse(filtersString);
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

  let root: Root;

  set(settings, 'migrations.skip', true);
  set(settings, 'dataStreams.migrations.skip', true);
  set(settings, 'elasticsearch.skipStartupConnectionCheck', true);

  if (serverless) {
    // Satisfy spaces config for serverless:
    set(settings, 'xpack.spaces.allowFeatureVisibility', false);
    set(settings, 'xpack.spaces.allowSolutionVisibility', false);
    root = createServerlessKibana(settings, cliArgs);
  } else {
    root = createRootWithCorePlugins(settings, cliArgs);
  }
  await root.preboot();
  await root.setup();
  const { http } = await root.start();
  const oas = await http.generateOas({ baseUrl: 'http://localhost:5622', filters });
  process.send(JSON.stringify(oas));
})().catch((error) => {
  process.stderr.write(`UNHANDLED ERROR: ${error}`);
  process.exit(1);
});
