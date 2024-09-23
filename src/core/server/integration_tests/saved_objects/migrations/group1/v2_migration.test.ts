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
  defaultKibanaIndex,
  defaultKibanaTaskIndex,
  startElasticsearch,
  getAggregatedTypesCount,
  type KibanaMigratorTestKit,
  readLog,
  clearLog,
  currentVersion,
} from '../kibana_migrator_test_kit';
import {
  BASELINE_DOCUMENTS_PER_TYPE_500K,
  BASELINE_TEST_ARCHIVE_500K,
} from '../kibana_migrator_archive_utils';
import {
  baselineTypes,
  getReindexingBaselineTypes,
  getReindexingMigratorTestKit,
  getUpToDateMigratorTestKit,
} from '../kibana_migrator_test_kit.fixtures';
import { delay } from '../test_utils';

const logFilePath = join(__dirname, 'v2_migration.log');

describe('v2 migration', () => {
  let esServer: TestElasticsearchUtils;

  beforeAll(async () => {
    esServer = await startElasticsearch({ dataArchive: BASELINE_TEST_ARCHIVE_500K });
  });

  afterAll(async () => {
    if (esServer) {
      await esServer.stop();
      await delay(5); // give it a few seconds... cause we always do ¯\_(ツ)_/¯
    }
  });

  describe('to the current stack version', () => {
    let upToDateKit: KibanaMigratorTestKit;
    let migrationResults: MigrationResult[];

    beforeAll(async () => {
      await clearLog(logFilePath);
      upToDateKit = await getUpToDateMigratorTestKit({
        logFilePath,
        kibanaVersion: currentVersion,
      });
      migrationResults = await upToDateKit.runMigrations();
    });

    it('skips UPDATE_TARGET_MAPPINGS_PROPERTIES if there are no changes in the mappings', async () => {
      const logs = await readLog(logFilePath);
      expect(logs).not.toMatch('CREATE_NEW_TARGET');
      expect(logs).toMatch(
        `[${defaultKibanaIndex}] CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS`
      );
      expect(logs).toMatch(
        `[${defaultKibanaTaskIndex}] CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS`
      );
      expect(logs).not.toMatch('UPDATE_TARGET_MAPPINGS_PROPERTIES');
      expect(logs).not.toMatch('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK');
      expect(logs).not.toMatch('UPDATE_TARGET_MAPPINGS_META');
    });

    it(`returns a 'patched' status for each SO index`, () => {
      // omit elapsedMs as it varies in each execution
      expect(migrationResults.map((result) => omit(result, 'elapsedMs'))).toMatchInlineSnapshot(`
        Array [
          Object {
            "destIndex": ".kibana_migrator_9.0.0_001",
            "status": "patched",
          },
          Object {
            "destIndex": ".kibana_migrator_tasks_9.0.0_001",
            "status": "patched",
          },
        ]
      `);
    });

    it('each migrator takes less than 10 seconds', () => {
      expect(
        (migrationResults as Array<{ elapsedMs?: number }>).every(
          ({ elapsedMs }) => !elapsedMs || elapsedMs < 10000
        )
      ).toEqual(true);
    });
  });

  describe('to a newer stack version', () => {
    describe('with unknown types', () => {
      let unknownTypesKit: KibanaMigratorTestKit;

      beforeAll(async () => {
        await clearLog(logFilePath);
        unknownTypesKit = await getReindexingMigratorTestKit({
          logFilePath,
          // filter out 'task' objects in order to not spawn that migrator for this test
          types: getReindexingBaselineTypes(true).filter(({ name }) => name !== 'task'),
          settings: {
            migrations: {
              discardUnknownObjects: currentVersion, // instead of the actual target, 'nextMinor'
            },
          },
        });
      });

      it('fails if Kibana is not configured to discard unknown objects', async () => {
        await expect(unknownTypesKit.runMigrations()).rejects.toThrowError(
          /Unable to complete saved object migrations for the \[\.kibana_migrator\] index: Migration failed because some documents were found which use unknown saved object types:/
        );

        const logs = await readLog(logFilePath);
        expect(logs).toMatch(`[${defaultKibanaIndex}] CHECK_UNKNOWN_DOCUMENTS -> FATAL.`);
      });
    });

    describe('with transform errors', () => {
      let transformErrorsKit: KibanaMigratorTestKit;

      beforeAll(async () => {
        await clearLog(logFilePath);
        transformErrorsKit = await getReindexingMigratorTestKit({
          logFilePath,
          // filter out 'task' objects in order to not spawn that migrator for this test
          types: getReindexingBaselineTypes(true).filter(({ name }) => name !== 'task'),
          settings: {
            migrations: {
              discardCorruptObjects: currentVersion, // instead of the actual target, 'nextMinor'
            },
          },
        });
      });

      it('collects corrupt saved object documents across batches', async () => {
        try {
          await transformErrorsKit.runMigrations();
        } catch (error) {
          const lines = error.message
            .split('\n')
            .filter((line: string) => line.includes(`'complex'`))
            .join('\n');
          expect(lines).toMatchSnapshot();
        }
      });

      it('fails if Kibana is not configured to discard transform errors', async () => {
        const logs = await readLog(logFilePath);
        expect(logs).toMatch(
          `Cannot convert 'complex' objects with values that are multiple of 100`
        );
        expect(logs).toMatch(`[${defaultKibanaIndex}] REINDEX_SOURCE_TO_TEMP_READ -> FATAL.`);
      });
    });

    describe('configured to discard transform errors and unknown types', () => {
      let kit: KibanaMigratorTestKit;
      let migrationResults: MigrationResult[];
      let logs: string;

      beforeAll(async () => {
        await clearLog(logFilePath);
        kit = await getReindexingMigratorTestKit({
          logFilePath,
          filterDeprecated: true,
        });
        migrationResults = await kit.runMigrations();
        logs = await readLog(logFilePath);
      });

      it('migrates documents to the highest version', async () => {
        const typeMigrationVersions: Record<string, string> = {
          basic: '10.1.0', // did not define any model versions
          complex: '10.2.0',
          task: '10.2.0',
        };

        const resultSets = await Promise.all(
          baselineTypes.map(({ name: type }) =>
            kit.client.search<any>({
              index: [defaultKibanaIndex, defaultKibanaTaskIndex],
              query: {
                bool: {
                  should: [
                    {
                      term: { type },
                    },
                  ],
                },
              },
            })
          )
        );

        expect(
          resultSets
            .flatMap((result) => result.hits.hits)
            .every(
              (document) =>
                document._source.typeMigrationVersion ===
                typeMigrationVersions[document._source.type]
            )
        ).toEqual(true);
      });

      describe('a migrator performing a compatible upgrade migration', () => {
        it('updates target mappings when mappings have changed', () => {
          expect(logs).toMatch(
            `[${defaultKibanaTaskIndex}] CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_PROPERTIES.`
          );
          expect(logs).toMatch(
            `[${defaultKibanaTaskIndex}] UPDATE_TARGET_MAPPINGS_PROPERTIES -> UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.`
          );
          expect(logs).toMatch(
            `[${defaultKibanaTaskIndex}] UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_META.`
          );
          expect(logs).toMatch(
            `[${defaultKibanaTaskIndex}] UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.`
          );
        });

        it('updates the version aliases during the PREPARE_COMPATIBLE_MIGRATION step', () => {
          expect(logs).toMatch(`[${defaultKibanaTaskIndex}] PREPARE_COMPATIBLE_MIGRATION`);
          expect(logs).not.toMatch(`[${defaultKibanaTaskIndex}] MARK_VERSION_INDEX_READY`);
          expect(logs).toMatch(
            `[${defaultKibanaTaskIndex}] CHECK_VERSION_INDEX_READY_ACTIONS -> DONE.`
          );
        });
      });

      describe('a migrator performing a reindexing migration', () => {
        describe('when an index contains SO types with incompatible mappings', () => {
          it('executes the reindexing migration steps', () => {
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
            // we discard the second half with exclude on upgrade (firstHalf !== true)
            // then we discard half all multiples of 100 (1% of them)
            expect(primaryIndexCounts.complex).toEqual(
              BASELINE_DOCUMENTS_PER_TYPE_500K / 2 - BASELINE_DOCUMENTS_PER_TYPE_500K / 2 / 100
            );
          });
        });

        it('returns a migrated status for each SO index', () => {
          // omit elapsedMs as it varies in each execution
          expect(migrationResults.map((result) => omit(result, 'elapsedMs')))
            .toMatchInlineSnapshot(`
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
  });
});
