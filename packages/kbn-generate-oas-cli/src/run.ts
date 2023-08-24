/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { run } from '@kbn/dev-cli-runner';
import { set } from '@kbn/safer-lodash-set';
import { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
import { type CoreVersionedRouter } from '@kbn/core-http-router-server-internal';
import { PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';

import { generateOpenApiDocument } from './generate_oas';

const OUTPUT_FILE = Path.resolve(__dirname, '../openapi.json');

run(
  async ({ log, addCleanupTask }) => {
    log.info('Registering all plugin routes...');

    const settings = {
      logging: {
        loggers: [{ name: 'root', level: 'error', appenders: ['console'] }],
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

    let done = false;
    try {
      await root.preboot();
      const { http } = await root.setup();

      log.info('Generating OpenAPI spec...');
      const spec = generateOpenApiDocument(
        http.getRegisteredRouters().map((r) => r.versioned as CoreVersionedRouter),
        { title: 'Kibana OpenAPI spec', baseUrl: '/', version: '0.0.0' }
      );

      log.info(`Writing OpenAPI spec ${OUTPUT_FILE}...`);
      await Fsp.writeFile(OUTPUT_FILE, JSON.stringify(spec, null, 2));

      log.success('Done!');
      done = true;
    } catch (e) {
      log.error(e);
      throw e;
    } finally {
      await root.shutdown().catch(() => {});
      process.exit(done ? 0 : 1);
    }
  },
  {
    description: 'Generate OpenAPI spec from versioned Kibana router declarations',
  }
);
