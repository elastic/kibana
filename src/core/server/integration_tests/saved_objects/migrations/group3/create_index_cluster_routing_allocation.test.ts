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
import { parse } from 'hjson';
import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { LogRecord } from '@kbn/logging';
import { retryAsync } from '@kbn/core-saved-objects-migration-server-mocks';
import { clearLog, defaultKibanaIndex } from '@kbn/migrator-test-kit';
import { getUpToDateMigratorTestKit } from '@kbn/migrator-test-kit/fixtures';

const logFilePath = Path.join(__dirname, 'create_index_cluster_routing_allocation.log');

const { startES } = createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
  settings: {
    es: {
      license: 'basic',
    },
  },
});

let esServer: TestElasticsearchUtils;

async function updateRoutingAllocations(
  esClient: ElasticsearchClient,
  settingType: string = 'persistent',
  value: string | null
) {
  return await esClient.cluster.putSettings({
    [settingType]: { cluster: { routing: { allocation: { enable: value } } } },
  });
}

const readLogRecords = async (): Promise<LogRecord[]> => {
  const logFileContent = await fs.readFile(logFilePath, 'utf-8');
  return logFileContent
    .split('\n')
    .filter(Boolean)
    .map((str) => parse(str)) as LogRecord[];
};

describe('create index cluster routing allocation', () => {
  beforeAll(async () => {
    await clearLog(logFilePath);
    esServer = await startES();
  });

  afterAll(async () => await esServer?.stop());

  it('retries CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION when cluster settings are incompatible', async () => {
    const { client, runMigrations } = await getUpToDateMigratorTestKit({
      logFilePath,
    });

    await updateRoutingAllocations(client, 'persistent', 'none');

    const runMigrationsPromise = runMigrations().catch(() => {
      // Silent catch because the test might be done and call shutdown before starting is completed, causing unwanted thrown errors.
    });

    try {
      const createIndexPathRegexp = new RegExp(
        `\\[${defaultKibanaIndex}\\] INIT -> CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION`
      );
      const incompatibleRoutingRetryRegexp =
        /Action failed with '\[incompatible_cluster_routing_allocation\] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed.+Retrying attempt 2 in 4 seconds./;

      await retryAsync(
        async () => {
          const records = await readLogRecords();
          expect(records.find((rec) => createIndexPathRegexp.test(rec.message))).toBeDefined();
        },
        { retryAttempts: 60, retryDelayMs: 500 }
      );

      await retryAsync(
        async () => {
          const records = await readLogRecords();
          expect(
            records.find((rec) => incompatibleRoutingRetryRegexp.test(rec.message))
          ).toBeDefined();
        },
        { retryAttempts: 60, retryDelayMs: 500 }
      );

      await updateRoutingAllocations(client, 'persistent', null);

      const createIndexRecoveryRegexp = new RegExp(
        `\\[${defaultKibanaIndex}\\] CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION -> CREATE_NEW_TARGET`
      );
      const migrationCompletedRegexp = new RegExp(
        `\\[${defaultKibanaIndex}\\] MARK_VERSION_INDEX_READY -> DONE`
      );

      await retryAsync(
        async () => {
          const records = await readLogRecords();
          expect(records.find((rec) => createIndexRecoveryRegexp.test(rec.message))).toBeDefined();
        },
        { retryAttempts: 60, retryDelayMs: 500 }
      );

      await retryAsync(
        async () => {
          const records = await readLogRecords();
          expect(records.find((rec) => migrationCompletedRegexp.test(rec.message))).toBeDefined();
        },
        { retryAttempts: 100, retryDelayMs: 500 }
      );
    } finally {
      await runMigrationsPromise;
    }
  });
});
