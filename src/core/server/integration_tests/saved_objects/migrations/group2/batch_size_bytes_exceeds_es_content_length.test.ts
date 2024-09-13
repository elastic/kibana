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
import {
  createTestServers,
  createRootWithCorePlugins,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { retryAsync } from '@kbn/core-saved-objects-migration-server-mocks';
import { Root } from '@kbn/core-root-server-internal';

const logFilePath = Path.join(__dirname, 'batch_size_bytes_exceeds_es_content_length.log');

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await fs.unlink(logFilePath).catch(() => void 0);
}

// Failing 9.0 version update: https://github.com/elastic/kibana/issues/192624
describe.skip('migration v2', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;
  let startES: () => Promise<TestElasticsearchUtils>;

  beforeAll(async () => {
    await removeLogFile();
  });

  beforeEach(() => {
    ({ startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          dataArchive: Path.join(
            __dirname,
            '..',
            'archives',
            '7.14.0_xpack_sample_saved_objects.zip'
          ),
          esArgs: ['http.max_content_length=1mb'],
        },
      },
    }));
  });

  afterEach(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('fails with a descriptive message when maxBatchSizeBytes exceeds ES http.max_content_length', async () => {
    root = createRoot({ maxBatchSizeBytes: 1715329 });
    esServer = await startES();
    await root.preboot();
    await root.setup();
    await expect(root.start()).rejects.toMatchInlineSnapshot(
      `[Error: Unable to complete saved object migrations for the [.kibana] index: While indexing a batch of saved objects, Elasticsearch returned a 413 Request Entity Too Large exception. Ensure that the Kibana configuration option 'migrations.maxBatchSizeBytes' is set to a value that is lower than or equal to the Elasticsearch 'http.max_content_length' configuration option.]`
    );

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
              `Reason: Unable to complete saved object migrations for the [.kibana] index: While indexing a batch of saved objects, Elasticsearch returned a 413 Request Entity Too Large exception. Ensure that the Kibana configuration option 'migrations.maxBatchSizeBytes' is set to a value that is lower than or equal to the Elasticsearch 'http.max_content_length' configuration option.`
            )
          )
        ).toBeDefined();
      },
      { retryAttempts: 10, retryDelayMs: 200 }
    );
  });
});

function createRoot(options: { maxBatchSizeBytes?: number }) {
  return createRootWithCorePlugins(
    {
      migrations: {
        skip: false,
        batchSize: 1000,
        maxBatchSizeBytes: options.maxBatchSizeBytes,
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
      oss: false,
    }
  );
}
