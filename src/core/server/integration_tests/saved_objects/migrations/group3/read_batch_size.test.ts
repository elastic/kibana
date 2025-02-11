/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import type { Root } from '@kbn/core-root-server-internal';
import {
  createRootWithCorePlugins,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { clearLog, readLog, startElasticsearch } from '../kibana_migrator_test_kit';
import { delay } from '../test_utils';
import { getFips } from 'crypto';

const logFilePath = join(__dirname, 'read_batch_size.log');

// FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/163254
// FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/163255
describe.skip('migration v2 - read batch size', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;
  let logs: string;

  beforeEach(async () => {
    esServer = await startElasticsearch({
      dataArchive: join(__dirname, '..', 'archives', '8.4.0_with_sample_data_logs.zip'),
    });
    await clearLog(logFilePath);
  });

  afterEach(async () => {
    await root?.shutdown();
    await esServer?.stop();
    await delay(5); // give it a few seconds... cause we always do ¯\_(ツ)_/¯
  });

  if (getFips() === 0) {
    it('reduces the read batchSize in half if a batch exceeds maxReadBatchSizeBytes', async () => {
      root = createRoot({ maxReadBatchSizeBytes: 15000 });
      await root.preboot();
      await root.setup();
      await root.start();

      // Check for migration steps present in the logs
      logs = await readLog(logFilePath);

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
      logs = await readLog(logFilePath);

      expect(logs).not.toMatch('retrying by reducing the batch size in half to');
      expect(logs).toMatch('[.kibana] Migration completed');
    });
  } else {
    it('cannot run tests with dataArchives that have a basic licesne in FIPS mode', () => {
      expect(getFips()).toBe(1);
    });
  }
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
