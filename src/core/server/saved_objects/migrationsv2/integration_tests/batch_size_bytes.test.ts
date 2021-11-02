/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import JSON5 from 'json5';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { Root } from '../../../root';
import { ElasticsearchClient } from '../../../elasticsearch';
import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/utils';
import { getEnvOptions } from '../../../config/mocks';
import { LogRecord } from '@kbn/logging';
import { retryAsync } from '../test_helpers/retry_async';

const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
const targetIndex = `.kibana_${kibanaVersion}_001`;
const logFilePath = Path.join(__dirname, 'batch_size_bytes.log');

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await fs.unlink(logFilePath).catch(() => void 0);
}

describe('migration v2', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: Root;
  let startES: () => Promise<kbnTestServer.TestElasticsearchUtils>;

  beforeAll(async () => {
    await removeLogFile();
  });

  beforeEach(() => {
    ({ startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          dataArchive: Path.join(__dirname, 'archives', '7.14.0_xpack_sample_saved_objects.zip'),
          esArgs: ['http.max_content_length=1715276b'],
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

    await new Promise((resolve) => setTimeout(resolve, 10000));
  });

  it('completes the migration even when a full batch would exceed ES http.max_content_length', async () => {
    root = createRoot({ maxBatchSizeBytes: 1715276 });
    esServer = await startES();
    await root.preboot();
    await root.setup();
    await expect(root.start()).resolves.toBeTruthy();

    // After plugins start, some saved objects are deleted/recreated, so we
    // wait a bit for the count to settle.
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const esClient: ElasticsearchClient = esServer.es.getClient();
    const migratedIndexResponse = await esClient.count({
      index: targetIndex,
    });
    const oldIndexResponse = await esClient.count({
      index: '.kibana_7.14.0_001',
    });

    // Use a >= comparison since once Kibana has started it might create new
    // documents like telemetry tasks
    expect(migratedIndexResponse.body.count).toBeGreaterThanOrEqual(oldIndexResponse.body.count);
  });

  it('fails with a descriptive message when a single document exceeds maxBatchSizeBytes', async () => {
    root = createRoot({ maxBatchSizeBytes: 1015275 });
    esServer = await startES();
    await root.preboot();
    await root.setup();
    await expect(root.start()).rejects.toMatchInlineSnapshot(
      `[Error: Unable to complete saved object migrations for the [.kibana] index: The document with _id "canvas-workpad-template:workpad-template-061d7868-2b4e-4dc8-8bf7-3772b52926e5" is 1715276 bytes which exceeds the configured maximum batch size of 1015275 bytes. To proceed, please increase the 'migrations.maxBatchSizeBytes' Kibana configuration option and ensure that the Elasticsearch 'http.max_content_length' configuration option is set to an equal or larger value.]`
    );

    await retryAsync(
      async () => {
        const logFileContent = await fs.readFile(logFilePath, 'utf-8');
        const records = logFileContent
          .split('\n')
          .filter(Boolean)
          .map((str) => JSON5.parse(str)) as LogRecord[];
        expect(
          records.find((rec) =>
            rec.message.startsWith(
              `Unable to complete saved object migrations for the [.kibana] index: The document with _id "canvas-workpad-template:workpad-template-061d7868-2b4e-4dc8-8bf7-3772b52926e5" is 1715276 bytes which exceeds the configured maximum batch size of 1015275 bytes. To proceed, please increase the 'migrations.maxBatchSizeBytes' Kibana configuration option and ensure that the Elasticsearch 'http.max_content_length' configuration option is set to an equal or larger value.`
            )
          )
        ).toBeDefined();
      },
      { retryAttempts: 10, retryDelayMs: 200 }
    );
  });
});

function createRoot(options: { maxBatchSizeBytes?: number }) {
  return kbnTestServer.createRootWithCorePlugins(
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
