/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { omit } from 'lodash';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { MigrationResult } from '@kbn/core-saved-objects-base-server-internal';

import {
  nextMinor,
  defaultKibanaIndex,
  defaultKibanaTaskIndex,
  startElasticsearch,
  getAggregatedTypesCount,
  type KibanaMigratorTestKit,
  readLog,
  clearLog,
} from '../kibana_migrator_test_kit';
import {
  BASELINE_DOCUMENTS_PER_TYPE_500K,
  BASELINE_TEST_ARCHIVE_500K,
} from '../kibana_migrator_archive_utils';
import { getReindexingMigratorTestKit } from '../kibana_migrator_test_kit.fixtures';
import { delay } from '../test_utils';

const logFilePath = join(__dirname, 'v2_migration.log');

describe('v2 migration', () => {
  let esServer: TestElasticsearchUtils;
  let kit: KibanaMigratorTestKit;
  let migrationResults: MigrationResult[];

  beforeAll(async () => {
    esServer = await startElasticsearch({ dataArchive: BASELINE_TEST_ARCHIVE_500K });
    await clearLog(logFilePath);
    kit = await getReindexingMigratorTestKit({
      logFilePath,
      filterDeprecated: true,
      settings: {
        migrations: {
          discardUnknownObjects: nextMinor,
        },
      },
    });
    migrationResults = await kit.runMigrations();
  });

  afterAll(async () => {
    if (esServer) {
      await esServer.stop();
      await delay(5); // give it a few seconds... cause we always do ¯\_(ツ)_/¯
    }
  });

  describe('a migrator performing a reindexing migration', () => {
    describe('when an index contains SO types with incompatible mappings', () => {
      it('executes the reindexing migration steps', async () => {
        const logs = await readLog(logFilePath);
        expect(logs).toMatch(`[${defaultKibanaIndex}] INIT -> WAIT_FOR_YELLOW_SOURCE.`);
        expect(logs).toMatch(
          `[${defaultKibanaIndex}] WAIT_FOR_YELLOW_SOURCE -> UPDATE_SOURCE_MAPPINGS_PROPERTIES.`
        );
        expect(logs).toMatch(
          `[${defaultKibanaIndex}] UPDATE_SOURCE_MAPPINGS_PROPERTIES -> CHECK_CLUSTER_ROUTING_ALLOCATION.`
        );
        expect(logs).toMatch(
          `[${defaultKibanaIndex}] CHECK_CLUSTER_ROUTING_ALLOCATION -> CHECK_UNKNOWN_DOCUMENTS.`
        );
        expect(logs).toMatch(
          `[${defaultKibanaIndex}] CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_PROPERTIES.`
        );
        expect(logs).toMatch(
          `[${defaultKibanaIndex}] UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.`
        );
        expect(logs).toMatch(
          `[${defaultKibanaIndex}] CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY.`
        );
        expect(logs).toMatch(`[${defaultKibanaIndex}] MARK_VERSION_INDEX_READY -> DONE.`);

        expect(logs).not.toMatch(`[${defaultKibanaIndex}] CREATE_NEW_TARGET`);
        expect(logs).not.toMatch(`[${defaultKibanaIndex}] CLEANUP_UNKNOWN_AND_EXCLUDED`);
        expect(logs).not.toMatch(`[${defaultKibanaIndex}] PREPARE_COMPATIBLE_MIGRATION`);
      });
    });

    describe('copies the right documents over to the target indices', () => {
      let primaryIndexCounts: Record<string, number>;
      let taskIndexCounts: Record<string, number>;

      beforeAll(async () => {
        primaryIndexCounts = await getAggregatedTypesCount(kit.client, defaultKibanaIndex);
        taskIndexCounts = await getAggregatedTypesCount(kit.client, defaultKibanaTaskIndex);
      });

      it('copies documents to the right indices depending on their types', () => {
        expect(primaryIndexCounts.basic).toBeDefined();
        expect(primaryIndexCounts.complex).toBeDefined();
        expect(primaryIndexCounts.task).not.toBeDefined();

        expect(taskIndexCounts.basic).not.toBeDefined();
        expect(taskIndexCounts.complex).not.toBeDefined();
        expect(taskIndexCounts.task).toBeDefined();
      });

      it('discards REMOVED_TYPES', () => {
        expect(primaryIndexCounts.server).not.toBeDefined();
        expect(taskIndexCounts.server).not.toBeDefined();
      });

      it('discards unknown types', () => {
        expect(primaryIndexCounts.deprecated).not.toBeDefined();
        expect(taskIndexCounts.deprecated).not.toBeDefined();
      });

      it('copies all of the documents', () => {
        expect(primaryIndexCounts.basic).toEqual(BASELINE_DOCUMENTS_PER_TYPE_500K);
        expect(taskIndexCounts.task).toEqual(BASELINE_DOCUMENTS_PER_TYPE_500K);
      });

      it('executes the excludeOnUpgrade hook', () => {
        expect(primaryIndexCounts.complex).toEqual(BASELINE_DOCUMENTS_PER_TYPE_500K / 2);
      });
    });

    it('returns a migrated status for each SO index', () => {
      // omit elapsedMs as it varies in each execution
      expect(migrationResults.map((result) => omit(result, 'elapsedMs'))).toMatchInlineSnapshot(`
      Array [
        Object {
          "destIndex": ".kibana_migrator_9.1.0_001",
          "sourceIndex": ".kibana_migrator_9.0.0_001",
          "status": "migrated",
        },
        Object {
          "destIndex": ".kibana_migrator_tasks_9.0.0_001",
          "sourceIndex": ".kibana_migrator_tasks_9.0.0_001",
          "status": "migrated",
        },
      ]
    `);
    });

    it('each migrator takes less than 60 seconds', () => {
      expect(
        (migrationResults as Array<{ elapsedMs?: number }>).every(
          ({ elapsedMs }) => !elapsedMs || elapsedMs < 60000
        )
      ).toEqual(true);
    });
  });
});
