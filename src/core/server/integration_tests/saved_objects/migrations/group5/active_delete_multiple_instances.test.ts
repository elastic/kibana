/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { readFile, unlink } from 'fs/promises';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  defaultLogFilePath,
  getAggregatedTypesCount,
  getEsClient,
  nextMinor,
  startElasticsearch,
} from '../kibana_migrator_test_kit';
import { getUpToDateMigratorTestKit } from '../kibana_migrator_test_kit.fixtures';
import {
  BASELINE_TEST_ARCHIVE_500K,
  BASELINE_DOCUMENTS_PER_TYPE_500K,
} from '../kibana_migrator_archive_utils';

const PARALLEL_MIGRATORS = 6;
jest.setTimeout(24 * 3600 * 100);

describe('multiple migrator instances running in parallel', () => {
  describe('when upgrading to a new stack version with matching mappings', () => {
    let esServer: TestElasticsearchUtils['es'];
    let esClient: ElasticsearchClient;
    beforeAll(async () => {
      esServer = await startElasticsearch({ dataArchive: BASELINE_TEST_ARCHIVE_500K });
      esClient = await getEsClient();
      await unlink(defaultLogFilePath).catch(() => {});

      for (let i = 0; i < PARALLEL_MIGRATORS; ++i) {
        await unlink(join(__dirname, `active_delete_instance_${i}.log`)).catch(() => {});
      }
    });

    it('will actively delete and sccessfully complete migration', async () => {
      const startTime = Date.now();

      const beforeCleanup = await getAggregatedTypesCount(esClient);
      expect(beforeCleanup.server).toEqual(BASELINE_DOCUMENTS_PER_TYPE_500K);
      expect(beforeCleanup.basic).toEqual(BASELINE_DOCUMENTS_PER_TYPE_500K);
      expect(beforeCleanup.deprecated).toEqual(BASELINE_DOCUMENTS_PER_TYPE_500K);
      expect(beforeCleanup.complex).toEqual(BASELINE_DOCUMENTS_PER_TYPE_500K);
      expect(beforeCleanup.task).toEqual(BASELINE_DOCUMENTS_PER_TYPE_500K);

      const testKits = await Promise.all(
        new Array(PARALLEL_MIGRATORS)
          .fill({
            filterDeprecated: true,
            settings: {
              migrations: {
                discardUnknownObjects: nextMinor,
              },
            },
          })
          .map((config, index) =>
            getUpToDateMigratorTestKit({
              ...config,
              logFilePath: join(__dirname, `active_delete_instance_${index}.log`),
            })
          )
      );

      const results = await Promise.all(testKits.map((testKit) => testKit.runMigrations()));
      expect(results.flat().every((result) => result.status === 'migrated')).toEqual(true);

      for (let i = 0; i < PARALLEL_MIGRATORS; ++i) {
        const logs = await readFile(join(__dirname, `active_delete_instance_${i}.log`), 'utf-8');
        expect(logs).toMatch('CHECK_VERSION_INDEX_READY_ACTIONS -> DONE');
        expect(logs).toMatch('Migration completed');
      }

      const endTime = Date.now();
      // eslint-disable-next-line no-console
      console.debug(`Migration took: ${(endTime - startTime) / 1000} seconds`);

      // After cleanup
      const afterCleanup = await getAggregatedTypesCount(testKits[0].client);
      expect(afterCleanup.server).not.toBeDefined(); // 'server' is part of the REMOVED_TYPES
      expect(afterCleanup.basic).toEqual(BASELINE_DOCUMENTS_PER_TYPE_500K); // we keep 'basic' SOs
      expect(afterCleanup.deprecated).not.toBeDefined(); // 'deprecated' is no longer present in nextMinor's mappings
      expect(afterCleanup.complex).toEqual(BASELINE_DOCUMENTS_PER_TYPE_500K / 2); // we excludeFromUpgrade half of them with a hook
      expect(afterCleanup.task).toEqual(BASELINE_DOCUMENTS_PER_TYPE_500K); // 'task' SO are on a dedicated index
    });

    afterAll(async () => {
      await esServer?.stop();
    });
  });
});
