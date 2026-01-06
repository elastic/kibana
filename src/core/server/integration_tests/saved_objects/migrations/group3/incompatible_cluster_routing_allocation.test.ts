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
import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { LogRecord } from '@kbn/logging';
import { retryAsync } from '@kbn/core-saved-objects-migration-server-mocks';
import { BASELINE_TEST_ARCHIVE_SMALL } from '../kibana_migrator_archive_utils';
import { getRelocatingMigratorTestKit } from '@kbn/migrator-test-kit/fixtures';
import { clearLog } from '@kbn/migrator-test-kit';

const logFilePath = Path.join(__dirname, 'incompatible_cluster_routing_allocation.log');

const { startES } = createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
  settings: {
    es: {
      license: 'basic',
      dataArchive: BASELINE_TEST_ARCHIVE_SMALL,
    },
  },
});

const getClusterRoutingAllocations = (settings: Record<string, any>) => {
  const routingAllocations =
    settings?.transient?.['cluster.routing.allocation.enable'] ??
    settings?.persistent?.['cluster.routing.allocation.enable'] ??
    [];
  return (
    [...routingAllocations].length === 0 ||
    [...routingAllocations].every((s: string) => s === 'all')
  ); // if set, only allow 'all';
};
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

describe('incompatible_cluster_routing_allocation', () => {
  beforeAll(async () => {
    await clearLog(logFilePath);
    esServer = await startES();
  });

  afterAll(async () => await esServer?.stop());

  it('retries the INIT action with a descriptive message when cluster settings are incompatible', async () => {
    const { client, runMigrations } = await getRelocatingMigratorTestKit({
      logFilePath,
    });

    const initialSettings = await client.cluster.getSettings({ flat_settings: true });

    expect(getClusterRoutingAllocations(initialSettings)).toBe(true);

    await updateRoutingAllocations(client, 'persistent', 'none');

    const updatedSettings = await client.cluster.getSettings({ flat_settings: true });

    expect(getClusterRoutingAllocations(updatedSettings)).toBe(false);

    const runMigrationsPromise = runMigrations().catch(() => {
      // Silent catch because the test might be done and call shutdown before starting is completed, causing unwanted thrown errors.
    });

    try {
      const messageRegexp =
        /Action failed with \'\[incompatible_cluster_routing_allocation\] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting \'cluster.routing.allocation.enable\' or set it to a value of \'all\' to allow migrations to proceed.+Retrying attempt 2 in 4 seconds./;

      // Wait for the INIT -> INIT action retry
      await retryAsync(
        async () => {
          const logFileContent = await fs.readFile(logFilePath, 'utf-8');
          const records = logFileContent
            .split('\n')
            .filter(Boolean)
            .map((str) => JSON5.parse(str)) as LogRecord[];

          // Wait for logs of the second failed attempt to be sure we're correctly incrementing retries
          expect(records.find((rec) => !!rec.message.match(messageRegexp))).toBeDefined();
        },
        { retryAttempts: 20, retryDelayMs: 500 }
      );

      // Reset the cluster routing allocation settings
      await updateRoutingAllocations(client, 'persistent', null);

      // Wait for migrations to succeed
      await retryAsync(
        async () => {
          const logFileContent = await fs.readFile(logFilePath, 'utf-8');
          const records = logFileContent
            .split('\n')
            .filter(Boolean)
            .map((str) => JSON5.parse(str)) as LogRecord[];

          expect(
            records.find((rec) => rec.message.includes('MARK_VERSION_INDEX_READY_SYNC -> DONE'))
          ).toBeDefined();
        },
        { retryAttempts: 100, retryDelayMs: 500 }
      );
    } finally {
      await runMigrationsPromise; // Wait for migrations to complete
    }
  });
});
