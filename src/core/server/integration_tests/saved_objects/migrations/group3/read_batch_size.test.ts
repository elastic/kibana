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
import { Root } from '@kbn/core-root-server-internal';
import {
  createRootWithCorePlugins,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { startElasticsearch } from '../kibana_migrator_test_kit';

const logFilePath = Path.join(__dirname, 'read_batch_size.log');

describe('migration v2 - read batch size', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;
  let logs: string;

  beforeEach(async () => {
    esServer = await startElasticsearch({
      dataArchive: Path.join(__dirname, '..', 'archives', '8.4.0_with_sample_data_logs.zip'),
    });
    await fs.unlink(logFilePath).catch(() => {});
  });

  afterEach(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('reduces the read batchSize in half if a batch exceeds maxReadBatchSizeBytes', async () => {
    root = createRoot({ maxReadBatchSizeBytes: 15000 });
    await root.preboot();
    await root.setup();
    await root.start();

    // Check for migration steps present in the logs
    logs = await fs.readFile(logFilePath, 'utf-8');

    expect(logs).toMatch(
      /Read a batch with a response content length of \d+ bytes which exceeds migrations\.maxReadBatchSizeBytes, retrying by reducing the batch size in half to 15/
    );
    expect(logs).toMatch('[.kibana] Migration completed');
  });

  it('does not reduce the read batchSize in half if no batches exceeded maxReadBatchSizeBytes', async () => {
    root = createRoot({ maxReadBatchSizeBytes: 50000 });
    await root.preboot();
    await root.setup();
    await root.start();

    // Check for migration steps present in the logs
    logs = await fs.readFile(logFilePath, 'utf-8');

    expect(logs).not.toMatch('retrying by reducing the batch size in half to');
    expect(logs).toMatch('[.kibana] Migration completed');
  });
});

function createRoot({ maxReadBatchSizeBytes }: { maxReadBatchSizeBytes?: number }) {
  return createRootWithCorePlugins(
    {
      migrations: {
        maxReadBatchSizeBytes,
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
