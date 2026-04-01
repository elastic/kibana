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
} from '@kbn/migrator-test-kit';
import { BASELINE_TEST_ARCHIVE_LARGE } from '../kibana_migrator_archive_utils';
import { getUpToDateMigratorTestKit } from '@kbn/migrator-test-kit/fixtures';

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

});
