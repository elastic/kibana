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
import axios from 'axios';
import { mergeWith } from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import { CoreVersionedRouter } from '@kbn/core-http-router-server-internal';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';

import { generateOpenApiDocument } from './generate_oas';
import { waitUntilAPIReady } from './wait_until_api_ready';

const OUTPUT_FILE = Path.resolve(__dirname, '../openapi.json');

run(
  async ({ log, addCleanupTask }) => {
    log.info('Registering all plugin routes...');

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

    let done = false;
    let stopKibana;
    let stopES;

    try {
      const { stop: _stopES } = await startES();
      const { coreSetup, coreStart, stop: _stopKibana } = await startKibana();
      stopKibana = _stopKibana;
      stopES = _stopES;

      log.info('Generating OpenAPI spec...');

      const spec = generateOpenApiDocument(
        coreSetup.http.getRegisteredRouters().map((r) => r.versioned as CoreVersionedRouter),
        { title: 'Kibana OpenAPI spec', baseUrl: '/', version: '0.0.0' }
      );

      log.info('Loading server side generated OpenAPI spec...');

      const { protocol, hostname, port } = coreStart.http.getServerInfo();
      const url = `${protocol}://${hostname}:${port}/generate_oas`;
      // TODO: Better way of doing it? Without waiting I get:
      // License is not available, authentication is not possible
      await waitUntilAPIReady(url, log);

      const { data } = await axios.get(url, {
        auth: { username: 'elastic', password: 'changeme' },
      });

      log.info('Merging OpenAPI specs...');

      const output = mergeWith(
        spec,
        data,
        (objValue: OpenAPIV3.SchemaObject, srcValue: OpenAPIV3.SchemaObject, key: string) => {
          // use schema from server side generated spec
          if (key === 'schema') {
            return srcValue;
          }
          return undefined;
        }
      );

      log.info(`Writing OpenAPI spec ${OUTPUT_FILE}...`);
      await Fsp.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));

      log.success('Done!');
      done = true;
    } catch (e) {
      log.error(e);
      throw e;
    } finally {
      if (stopKibana) await stopKibana();
      if (stopES) await stopES();
      process.exit(done ? 0 : 1);
    }
  },
  {
    description: 'Generate OpenAPI spec from versioned Kibana router declarations',
  }
);
