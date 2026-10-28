/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import Util from 'util';
import { firstValueFrom } from 'rxjs';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { Root } from '@kbn/core-root-server-internal';

const logFilePath = Path.join(__dirname, 'cleanup.log');
const asyncUnlink = Util.promisify(Fs.unlink);

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await asyncUnlink(logFilePath).catch(() => void 0);
}

function createRoot({ skipMigration }: { skipMigration: boolean }) {
  return createRootWithCorePlugins(
    {
      migrations: {
        skip: skipMigration,
      },
      logging: {
        appenders: {
          file: {
            type: 'file',
            fileName: logFilePath,
            layout: {
              type: 'json',
            },
          },
        },
        loggers: [
          {
            name: 'root',
            appenders: ['file'],
            level: 'info',
          },
        ],
      },
    },
    {
      oss: true,
    }
  );
}

describe('starting with `migration.skip: true` when indices are up to date', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;

  beforeAll(async () => {
    await removeLogFile();
  });

  afterAll(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('starts and display the correct service status', async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
        },
      },
    });
    esServer = await startES();

    // booting root a first time to setup the indices
    root = createRoot({ skipMigration: false });
    await root.preboot();
    await root.setup();
    await root.start();
    await root.shutdown();

    // booting another root with migration skipped this time
    root = createRoot({ skipMigration: true });
    await root.preboot();
    const setup = await root.setup();
    await root.start();

    const status = await firstValueFrom(setup.status.core$);
    expect(status.savedObjects.level.toString()).toEqual('available');
    expect(status.savedObjects.summary).toEqual(
      'SavedObjects service has completed migrations and is available'
    );
  });
});
