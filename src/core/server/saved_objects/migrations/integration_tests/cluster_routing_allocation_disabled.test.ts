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
import { LogRecord } from '@kbn/logging';
import { retryAsync } from '../test_helpers/retry_async';

const logFilePath = Path.join(__dirname, 'cluste_routing_allocation_disabled.log');

describe('cluster_routing_allocation_disabled', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: Root;

  afterEach(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  });

  const startEsServer = async ({ esArgs = [] }: { esArgs?: string[] } = {}) => {
    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: jest.setTimeout,
      settings: {
        es: {
          license: 'basic',
          dataArchive: Path.join(__dirname, 'archives', '7.14.0_xpack_sample_saved_objects.zip'),
          esArgs,
        },
      },
    });
    return startES();
  };

  it('fails with a descriptive message when a routing allocation is disabled as a transient setting', async () => {
    root = createRoot({});
    esServer = await startEsServer({ esArgs: ['cluster.routing.allocation.enable=none'] });
    await root.preboot();
    await root.setup();
    await expect(root.start()).rejects.toMatchInlineSnapshot(
      `[Error: Unable to complete saved object migrations for the [.kibana] index: Cluster routing allocation is not enabled. To proceed, please enable routing.]`
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
              `Unable to complete saved object migrations for the [.kibana] index: Cluster routing allocation is not enabled. To proceed, please enable routing.`
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
          console: {
            type: 'console',
            layout: {
              type: 'pattern',
              highlight: true,
              pattern: '[%date][%level][%logger]---%message',
            },
          },
        },
        loggers: [
          {
            name: 'root',
            level: 'info',
            appenders: ['file', 'console'],
          },
        ],
      },
    },
    {
      oss: false,
    }
  );
}
