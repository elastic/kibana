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

import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';
import { ToolingLog } from '@kbn/tooling-log';
import type { ServerHandles } from '../types';

export async function startServers(): Promise<ServerHandles> {
  const kibanaLog = resolve(os.tmpdir(), 'kibana.log');

  const { startES } = createTestServers({
    adjustTimeout: () => {},
    settings: {
      es: {
        // Silent logging
        log: new ToolingLog({ level: 'silent', writeTo: { write: (s: string) => {} } }),
      },
    },
  });

  const esServer = await startES();
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
    },
    { oss: false }
  );
  await kibanaRoot.preboot();
  await kibanaRoot.setup();
  const coreStart = await kibanaRoot.start();
  return { esServer, kibanaRoot, coreStart };
}

export async function stopServers({
  log,
  serverHandles,
}: {
  log: ToolingLog;
  serverHandles?: ServerHandles;
}) {
  if (!serverHandles) {
    log.debug('No server to terminate.');
    return;
  }

  try {
    await delay(2);
    await Promise.race([
      serverHandles.kibanaRoot?.shutdown(),
      timeout(8, 'Timeout waiting for Kibana to stop'),
    ]);

    log.info("Kibana's shutdown done!");
  } catch (ex) {
    log.error('Error while stopping kibana.');
    log.error(ex);
  }

  try {
    await delay(5);
    await Promise.race([
      serverHandles.esServer.stop(),
      timeout(5, 'Timeout waiting for ES to stop'),
    ]);
    log.info('ES Stopped!');
  } catch (ex) {
    log.error('Error while stopping ES.');
    log.error(ex);
  }
}

async function delay(seconds: number): Promise<void> {
  await new Promise((r) => setTimeout(r, 1000 * seconds));
}

async function timeout(seconds: number, message: string): Promise<void> {
  await delay(seconds);
  throw new Error(message);
}
