/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as os from 'os';
import { resolve } from 'path';

import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';
import { ToolingLog } from '@kbn/tooling-log';
import { setTimeout as timer } from 'timers/promises';
import type { Root } from '@kbn/core-root-server-internal';

export async function startElasticsearch(): Promise<TestElasticsearchUtils> {
  const { startES } = createTestServers({
    adjustTimeout: () => {},
    settings: {
      es: {
        // Silent logging
        log: new ToolingLog({ level: 'silent', writeTo: { write: (s: string) => {} } }),
      },
    },
  });

  return await startES();
}

export async function setupKibana(): Promise<Root> {
  const kibanaLog = resolve(os.tmpdir(), 'kibana.log');
  const kibanaRoot = createRootWithCorePlugins(
    {
      logging: {
        loggers: [
          {
            name: 'root',
            level: 'error',
            appenders: ['file'],
          },
        ],
        appenders: {
          deprecation: { type: 'console', layout: { type: 'json' } },
          console: { type: 'console', layout: { type: 'pattern' } },
          file: { type: 'file', fileName: kibanaLog, layout: { type: 'json' } },
        },
      },

      plugins: {
        [ENABLE_ALL_PLUGINS_CONFIG_PATH]: true,
      },
      node: {
        roles: ['ui'],
      },
    },
    {
      oss: false,
      // running in 'dev' mode prevents cloud-experiments plugin to fail due to missing config
      dev: true,
    }
  );
  await kibanaRoot.preboot();
  await kibanaRoot.setup();
  return kibanaRoot;
}

export async function stopKibana(kibanaServer: Root) {
  await timer(2_000);
  await runWithTimeout(
    kibanaServer.shutdown.bind(kibanaServer),
    'Timeout waiting for Kibana to stop'
  );
}

export async function stopElasticsearch(esServer: TestElasticsearchUtils) {
  await timer(2_000);
  await runWithTimeout(esServer.stop.bind(esServer), 'Timeout waiting for ES to stop');
}

async function runWithTimeout(
  task: () => Promise<void>,
  message: string,
  millis: number = 5_000
): Promise<void> {
  const timeout = async () => {
    await timer(millis);
    throw new Error(message);
  };
  await Promise.race([task(), timeout()]);
}
