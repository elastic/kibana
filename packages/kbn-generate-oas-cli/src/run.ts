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
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';

import axios from 'axios';
import { generateOpenApiDocument } from './generate_oas';
import { waitUntilAPIReady } from './wait_until_api_ready';

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

    const { startES, startKibana } = createTestServers({
      adjustTimeout: () => {},
      settings: {
        es: {
          license: 'trial',
        },
        kbn: {
          server: {
            port: 5620,
          },
          // TODO: How to include the plugin only for this use case?
          // plugins: {
          //   paths: [Path.resolve(__dirname, '../plugins/')],
          // },
          cliArgs: {
            basePath: false,
            cache: false,
            dev: true,
            disableOptimizer: true,
            silent: false,
            dist: false,
            oss: false,
            runExamples: false,
            watch: false,
          },
        },
      },
    });

    await startES();

    let done = false;
    try {
      const { coreSetup, coreStart } = await startKibana();
      log.info('Generating OpenAPI spec...');

      const spec = generateOpenApiDocument(coreSetup.http.getRegisteredRouters(), {
        title: 'Kibana OpenAPI spec',
        baseUrl: '/',
        version: '0.0.0',
      });

      log.info(`Writing OpenAPI spec ${OUTPUT_FILE}...`);
      await Fsp.writeFile(OUTPUT_FILE, JSON.stringify(spec, null, 2));

      const { protocol, hostname, port } = coreStart.http.getServerInfo();
      const url = `${protocol}://${hostname}:${port}/docs/alerting`;

      // TODO: Better way of doing it? Without waiting I get:
      // License is not available, authentication is not possible
      await waitUntilAPIReady(url, log);

      const response = await axios.get(url, {
        auth: { username: 'elastic', password: 'changeme' },
      });
      console.log(JSON.stringify(response.data, null, 2));

      log.success('Done!');
      done = true;
    } catch (e) {
      log.error(e);
      throw e;
    } finally {
      // await root.shutdown().catch(() => {});
      process.exit(done ? 0 : 1);
    }
  },
  {
    description: 'Generate OpenAPI spec from versioned Kibana router declarations',
  }
);
