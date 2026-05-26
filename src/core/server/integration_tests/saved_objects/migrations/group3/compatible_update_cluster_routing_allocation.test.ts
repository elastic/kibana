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
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { LogRecord } from '@kbn/logging';
import { retryAsync } from '@kbn/core-saved-objects-migration-server-mocks';
import {
  clearLog,
  defaultKibanaIndex,
  nextMinor,
  startElasticsearch,
} from '@kbn/migrator-test-kit';
import {
  createBaseline,
  getCompatibleMigratorTestKit,
  getCompatibleBaselineTypes,
  REMOVED_TYPES,
} from '@kbn/migrator-test-kit/fixtures';

const logFilePath = Path.join(__dirname, 'compatible_update_cluster_routing_allocation.log');

let esServer: TestElasticsearchUtils['es'];
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

const readLogRecords = async (): Promise<LogRecord[]> => {
  const logFileContent = await fs.readFile(logFilePath, 'utf-8');
  return logFileContent
    .split('\n')
    .filter(Boolean)
    .map((str) => parse(str)) as LogRecord[];
};

describe('compatible_update_cluster_routing_allocation', () => {
  beforeAll(async () => {
    esServer = await startElasticsearch();
    esClient = await createBaseline();
  });

  beforeEach(async () => {
    await clearLog(logFilePath);
    await updateRoutingAllocations(esClient, 'persistent', null);
  });

  afterAll(async () => {
    await updateRoutingAllocations(esClient, 'persistent', null);
    await esServer?.stop();
  });

  it('retries COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION when cluster settings are incompatible', async () => {
    const { client, runMigrations } = await getCompatibleMigratorTestKit({
      logFilePath,
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
      const incompatibleRoutingRetryRegexp =
        /Action failed with '\[incompatible_cluster_routing_allocation\] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed.+Retrying attempt 2 in 4 seconds./;

      await retryAsync(
        async () => {
          const records = await readLogRecords();
          expect(
            records.find((rec) => compatibleUpdateCheckRegexp.test(rec.message))
          ).toBeDefined();
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

      const cleanupRecoveryRegexp = new RegExp(
        `\\[${defaultKibanaIndex}\\] COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION -> CLEANUP_UNKNOWN_AND_EXCLUDED`
      );
      const migrationCompletedRegexp = new RegExp(
        `\\[${defaultKibanaIndex}\\] CHECK_VERSION_INDEX_READY_ACTIONS -> DONE`
      );

      await retryAsync(
        async () => {
          const records = await readLogRecords();
          expect(records.find((rec) => cleanupRecoveryRegexp.test(rec.message))).toBeDefined();
        },
        { retryAttempts: 120, retryDelayMs: 500 }
      );

      await retryAsync(
        async () => {
          const records = await readLogRecords();
          expect(records.find((rec) => migrationCompletedRegexp.test(rec.message))).toBeDefined();
        },
        { retryAttempts: 120, retryDelayMs: 500 }
      );
    } finally {
      await runMigrationsPromise;
    }
  });
});
