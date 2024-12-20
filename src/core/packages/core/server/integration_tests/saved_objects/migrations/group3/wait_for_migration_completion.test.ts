/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import fs from 'fs/promises';
import JSON5 from 'json5';
import { kibanaPackageJson as pkg } from '@kbn/repo-info';
import { retryAsync } from '@kbn/core-saved-objects-migration-server-mocks';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { Root } from '@kbn/core-root-server-internal';

const logFilePath = Path.join(__dirname, 'wait_for_migration_completion.log');

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await fs.unlink(logFilePath).catch(() => void 0);
}

describe('migration with waitForCompletion=true', () => {
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

  it('waits for another instance to complete the migration', async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
        },
      },
    });

    root = createRoot();

    esServer = await startES();
    await root.preboot();
    await root.setup();

    void root.start();
    const esClient = esServer.es.getClient();

    await retryAsync(
      async () => {
        const logFileContent = await fs.readFile(logFilePath, 'utf-8');
        const records = logFileContent
          .split('\n')
          .filter(Boolean)
          .map((str) => JSON5.parse(str)) as any[];

        expect(
          records.find((rec) =>
            rec.message.startsWith(
              `[.kibana] Migration required. Waiting until another Kibana instance completes the migration.`
            )
          )
        ).toBeDefined();

        expect(
          records.find((rec) =>
            rec.message.startsWith(`[.kibana] INIT -> WAIT_FOR_MIGRATION_COMPLETION`)
          )
        ).toBeDefined();

        expect(
          records.find((rec) =>
            rec.message.startsWith(
              `[.kibana] WAIT_FOR_MIGRATION_COMPLETION -> WAIT_FOR_MIGRATION_COMPLETION`
            )
          )
        ).toBeDefined();
      },
      { retryAttempts: 100, retryDelayMs: 200 }
    );

    const aliases: Record<string, {}> = { '.kibana': {} };
    aliases[`.kibana_${pkg.version}`] = {};
    await esClient.indices.create({ index: `.kibana_${pkg.version}_001`, aliases });

    await retryAsync(
      async () => {
        const logFileContent = await fs.readFile(logFilePath, 'utf-8');
        const records = logFileContent
          .split('\n')
          .filter(Boolean)
          .map((str) => JSON5.parse(str)) as any[];

        expect(
          records.find((rec) =>
            rec.message.startsWith(`[.kibana] WAIT_FOR_MIGRATION_COMPLETION -> DONE`)
          )
        ).toBeDefined();

        expect(
          records.find((rec) => rec.message.startsWith(`[.kibana] Migration completed`))
        ).toBeDefined();
      },
      { retryAttempts: 100, retryDelayMs: 200 }
    );
  });
});

function createRoot() {
  return createRootWithCorePlugins(
    {
      migrations: {
        skip: false,
      },
      node: {
        roles: ['background_tasks'],
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
            level: 'info',
            appenders: ['file'],
          },
        ],
      },
    },
    {
      oss: true,
    }
  );
}
