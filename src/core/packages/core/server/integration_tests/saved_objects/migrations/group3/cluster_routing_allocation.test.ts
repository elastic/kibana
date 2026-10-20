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
import { clearLog, currentVersion, defaultKibanaIndex, nextMinor } from '@kbn/migrator-test-kit';
import {
  getCompatibleBaselineTypes,
  getCompatibleMigratorTestKit,
  getUpToDateMigratorTestKit,
  REMOVED_TYPES,
} from '@kbn/migrator-test-kit/fixtures';

const createIndexLogFilePath = Path.join(__dirname, 'cluster_routing_allocation_create_index.log');
const compatibleUpdateLogFilePath = Path.join(
  __dirname,
  'cluster_routing_allocation_compatible_update.log'
);

const incompatibleRoutingRetryRegexp =
  /Action failed with '\[incompatible_cluster_routing_allocation\] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed.+Retrying attempt 2 in 4 seconds./;

const { startES } = createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
  settings: {
    es: {
      license: 'basic',
    },
  },
});

let esServer: TestElasticsearchUtils;
let esClient: ElasticsearchClient;

async function updateRoutingAllocations(
  client: ElasticsearchClient,
  settingType: string = 'persistent',
  value: string | null
) {
  return await client.cluster.putSettings({
    [settingType]: { cluster: { routing: { allocation: { enable: value } } } },
  });
}

const readLogRecords = async (logFilePath: string): Promise<LogRecord[]> => {
  const logFileContent = await fs.readFile(logFilePath, 'utf-8');
  return logFileContent
    .split('\n')
    .filter(Boolean)
    .map((str) => parse(str)) as LogRecord[];
};

describe('cluster routing allocation', () => {
  beforeAll(async () => {
    esServer = await startES();
  });

  afterAll(async () => {
    if (esClient) {
      await updateRoutingAllocations(esClient, 'persistent', null);
    }
    await esServer?.stop();
  });

  it('retries CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION when cluster settings are incompatible', async () => {
    await clearLog(createIndexLogFilePath);

    const { client, runMigrations } = await getUpToDateMigratorTestKit({
      logFilePath: createIndexLogFilePath,
      kibanaVersion: currentVersion,
    });
    esClient = client;

    await updateRoutingAllocations(client, 'persistent', 'none');

    const runMigrationsPromise = runMigrations().catch(() => {
      // Silent catch because the test might be done and call shutdown before starting is completed, causing unwanted thrown errors.
    });

    try {
      const createIndexPathRegexp = new RegExp(
        `\\[${defaultKibanaIndex}\\] INIT -> CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION`
      );
      const createIndexRecoveryRegexp = new RegExp(
        `\\[${defaultKibanaIndex}\\] CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION -> CREATE_NEW_TARGET`
      );
      const migrationCompletedRegexp = new RegExp(
        `\\[${defaultKibanaIndex}\\] MARK_VERSION_INDEX_READY -> DONE`
      );

      await retryAsync(
        async () => {
          const records = await readLogRecords(createIndexLogFilePath);
          expect(records.find((rec) => createIndexPathRegexp.test(rec.message))).toBeDefined();
        },
        { retryAttempts: 60, retryDelayMs: 500 }
      );

      await retryAsync(
        async () => {
          const records = await readLogRecords(createIndexLogFilePath);
          expect(
            records.find((rec) => incompatibleRoutingRetryRegexp.test(rec.message))
          ).toBeDefined();
        },
        { retryAttempts: 60, retryDelayMs: 500 }
      );

      await updateRoutingAllocations(client, 'persistent', null);

      await retryAsync(
        async () => {
          const records = await readLogRecords(createIndexLogFilePath);
          expect(records.find((rec) => createIndexRecoveryRegexp.test(rec.message))).toBeDefined();
        },
        { retryAttempts: 60, retryDelayMs: 500 }
      );

      await retryAsync(
        async () => {
          const records = await readLogRecords(createIndexLogFilePath);
          expect(records.find((rec) => migrationCompletedRegexp.test(rec.message))).toBeDefined();
        },
        { retryAttempts: 100, retryDelayMs: 500 }
      );
    } finally {
      await runMigrationsPromise;
    }
  });

  it('retries COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION when cluster settings are incompatible', async () => {
    await clearLog(compatibleUpdateLogFilePath);
    await updateRoutingAllocations(esClient, 'persistent', null);

    const { client, runMigrations } = await getCompatibleMigratorTestKit({
      logFilePath: compatibleUpdateLogFilePath,
      types: getCompatibleBaselineTypes(REMOVED_TYPES),
      settings: {
        migrations: {
          discardUnknownObjects: nextMinor,
        },
      },
    });

    await updateRoutingAllocations(client, 'persistent', 'none');

    const runMigrationsPromise = runMigrations().catch(() => {
      // Silent catch because the test might be done and call shutdown before starting is completed, causing unwanted thrown errors.
    });

    try {
      const compatibleUpdateCheckRegexp = new RegExp(
        `\\[${defaultKibanaIndex}\\] UPDATE_SOURCE_MAPPINGS_PROPERTIES -> COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION`
      );
      const cleanupRecoveryRegexp = new RegExp(
        `\\[${defaultKibanaIndex}\\] COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION -> CLEANUP_UNKNOWN_AND_EXCLUDED`
      );
      const migrationCompletedRegexp = new RegExp(
        `\\[${defaultKibanaIndex}\\] CHECK_VERSION_INDEX_READY_ACTIONS -> DONE`
      );

      await retryAsync(
        async () => {
          const records = await readLogRecords(compatibleUpdateLogFilePath);
          expect(
            records.find((rec) => compatibleUpdateCheckRegexp.test(rec.message))
          ).toBeDefined();
        },
        { retryAttempts: 60, retryDelayMs: 500 }
      );

      await retryAsync(
        async () => {
          const records = await readLogRecords(compatibleUpdateLogFilePath);
          expect(
            records.find((rec) => incompatibleRoutingRetryRegexp.test(rec.message))
          ).toBeDefined();
        },
        { retryAttempts: 60, retryDelayMs: 500 }
      );

      await updateRoutingAllocations(client, 'persistent', null);

      await retryAsync(
        async () => {
          const records = await readLogRecords(compatibleUpdateLogFilePath);
          expect(records.find((rec) => cleanupRecoveryRegexp.test(rec.message))).toBeDefined();
        },
        { retryAttempts: 120, retryDelayMs: 500 }
      );

      await retryAsync(
        async () => {
          const records = await readLogRecords(compatibleUpdateLogFilePath);
          expect(records.find((rec) => migrationCompletedRegexp.test(rec.message))).toBeDefined();
        },
        { retryAttempts: 120, retryDelayMs: 500 }
      );
    } finally {
      await runMigrationsPromise;
    }
  });
});
