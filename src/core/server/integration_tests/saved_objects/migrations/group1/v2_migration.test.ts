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
  type KibanaMigratorTestKit,
  readLog,
  clearLog,
  currentVersion,
  getKibanaMigratorTestKit,
  nextMinor,
} from '@kbn/migrator-test-kit';
import { BASELINE_TEST_ARCHIVE_LARGE } from '../kibana_migrator_archive_utils';
import {
  getCompatibleBaselineTypes,
  getTransformErrorBaselineTypes,
  getUpToDateMigratorTestKit,
} from '@kbn/migrator-test-kit/fixtures';
import { expectDocumentsMigratedToHighestVersion } from '@kbn/migrator-test-kit/expect';

const logFilePath = join(__dirname, 'v2_migration.log');

describe('v2 migration', () => {
  let esServer: TestElasticsearchUtils;

  beforeAll(async () => {
    esServer = await startElasticsearch({ dataArchive: BASELINE_TEST_ARCHIVE_LARGE });
  });

  afterAll(async () => await esServer?.stop());

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

    it('updates the index mappings to account for new SO types', async () => {
      const res = await upToDateKit.client.indices.getMapping({ index: defaultKibanaIndex });
      const mappings = res[`${defaultKibanaIndex}_${currentVersion}_001`].mappings;

      expect(mappings.properties?.recent).toEqual({
        properties: {
          name: {
            type: 'keyword',
          },
        },
      });
    });

    it('skips UPDATE_TARGET_MAPPINGS_PROPERTIES if there are no changes in the mappings', async () => {
      const logs = await readLog(logFilePath);
      expect(logs).not.toMatch('CREATE_NEW_TARGET');

      // defaultKibana index has a new SO type ('recent'), thus we must update the _meta properties
      expect(logs).toMatch(
        `[${defaultKibanaIndex}] CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_META.`
      );
      expect(logs).toMatch(
        `[${defaultKibanaTaskIndex}] CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS`
      );

      // no updated types, so no pickup
      expect(logs).not.toMatch('UPDATE_TARGET_MAPPINGS_PROPERTIES');
    });

    it(`returns a 'patched' status for each SO index`, () => {
      // omit elapsedMs as it varies in each execution
      expect(migrationResults.map((result) => omit(result, 'elapsedMs'))).toEqual([
        {
          destIndex: `${defaultKibanaIndex}_${currentVersion}_001`,
          status: 'patched',
        },
        {
          destIndex: `${defaultKibanaTaskIndex}_${currentVersion}_001`,
          status: 'patched',
        },
      ]);
    });

    it('each migrator takes less than 10 seconds', () => {
      const painfulMigrator = (migrationResults as Array<{ elapsedMs?: number }>).find(
        ({ elapsedMs }) => elapsedMs && elapsedMs > 10_000
      );
      expect(painfulMigrator).toBeUndefined();
    });
  });

  describe('to a newer stack version', () => {
    describe('with unknown types', () => {
      let unknownTypesKit: KibanaMigratorTestKit;
      let logs: string;

      beforeAll(async () => {
        await clearLog(logFilePath);
        unknownTypesKit = await getKibanaMigratorTestKit({
          logFilePath,
          // we must exclude 'deprecated' from the list of registered types
          // so that it is considered unknown
          types: getCompatibleBaselineTypes(['server', 'task', 'deprecated']),
          // however we don't want to flag 'deprecated' as a removed type
          // because we want the migrator to consider it unknown
          removedTypes: ['server', 'task'],
          kibanaVersion: nextMinor,
          settings: {
            migrations: {
              discardUnknownObjects: currentVersion, // instead of the actual target, 'nextMinor'
            },
          },
        });
      });

      it('fails if Kibana is not configured to discard unknown objects', async () => {
        await expect(unknownTypesKit.runMigrations()).rejects.toThrowErrorMatchingInlineSnapshot(`
          "Unable to complete saved object migrations for the [.kibana_migrator] index: Migration failed because some documents were found which use unknown saved object types: deprecated
          To proceed with the migration you can configure Kibana to discard unknown saved objects for this migration.
          Please refer to https://www.elastic.co/docs/troubleshoot/kibana/migration-failures for more information."
        `);
        logs = await readLog(logFilePath);
        expect(logs).toMatch(
          'The flag `migrations.discardUnknownObjects` is defined but does not match the current kibana version; unknown objects will NOT be discarded.'
        );
        expect(logs).toMatch(
          `[${defaultKibanaIndex}] Migration failed because some documents were found which use unknown saved object types: deprecated`
        );
        expect(logs).toMatch(`[${defaultKibanaIndex}] CLEANUP_UNKNOWN_AND_EXCLUDED -> FATAL.`);
      });
    });

    describe('with transform errors', () => {
      let transformErrorsKit: KibanaMigratorTestKit;
      let logs: string;
      // filter out 'task' objects in order to not spawn that migrator for this test
      const removedTypes = ['deprecated', 'server', 'task'];
      beforeAll(async () => {
        await clearLog(logFilePath);
        transformErrorsKit = await getKibanaMigratorTestKit({
          logFilePath,
          removedTypes,
          kibanaVersion: nextMinor,
          types: getTransformErrorBaselineTypes(removedTypes),
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
        logs = await readLog(logFilePath);
        expect(logs).toMatch(
          `Cannot convert 'complex' objects with values that are multiple of 100`
        );
        expect(logs).toMatch(`[${defaultKibanaIndex}] OUTDATED_DOCUMENTS_SEARCH_READ -> FATAL.`);
      });
    });

    describe('configured to discard transform errors and unknown types', () => {
      let kit: KibanaMigratorTestKit;
      let logs: string;

      beforeAll(async () => {
        await clearLog(logFilePath);
        kit = await getKibanaMigratorTestKit({
          logFilePath,
          // we must exclude 'deprecated' from the list of registered types
          // so that it is considered unknown
          types: getTransformErrorBaselineTypes(['server', 'deprecated']),
          // however we don't want to flag 'deprecated' as a removed type
          // because we want the migrator to consider it unknown
          removedTypes: ['server'],
          kibanaVersion: nextMinor,
          settings: {
            migrations: {
              discardUnknownObjects: nextMinor,
              discardCorruptObjects: nextMinor,
            },
          },
        });

        await kit.runMigrations();
        logs = await readLog(logFilePath);
      });

      it('migrates documents to the highest version', async () => {
        await expectDocumentsMigratedToHighestVersion(kit.client, [
          defaultKibanaIndex,
          defaultKibanaTaskIndex,
        ]);
      });

      describe('a migrator performing a compatible upgrade migration', () => {
        it('updates mappings meta properties with the correct modelVersions (>=10.0.0)', async () => {
          const res = await kit.client.indices.getMapping({ index: defaultKibanaTaskIndex });
          const indexMeta = Object.values(res)[0].mappings._meta!;
          expect(indexMeta.mappingVersions.task).toEqual('10.2.0');
        });

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
    });
  });
});
