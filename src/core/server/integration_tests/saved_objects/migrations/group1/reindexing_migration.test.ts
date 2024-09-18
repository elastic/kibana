/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { MigrationResult } from '@kbn/core-saved-objects-base-server-internal';

import {
  defaultKibanaIndex,
  startElasticsearch,
  getAggregatedTypesCount,
  type KibanaMigratorTestKit,
  readLog,
  clearLog,
} from '../kibana_migrator_test_kit';

import {
  createBaseline,
  baselineDocuments,
  getReindexingMigratorTestKit,
} from '../kibana_migrator_test_kit.fixtures';

import { delay } from '../test_utils';
import { omit } from 'lodash';

const logFilePath = join(__dirname, 'reindexing_migration.log');

describe('reindexing migrations', () => {
  let es: TestElasticsearchUtils;
  let kit: KibanaMigratorTestKit;
  let migrationResults: MigrationResult[];

  beforeAll(async () => {
    es = await startElasticsearch();
    await createBaseline();
    await clearLog(logFilePath);
    kit = await getReindexingMigratorTestKit({ logFilePath });
    migrationResults = await kit.runMigrations();
  });

  afterAll(async () => {
    if (es) {
      es.stop();
      await delay(5); // give it a few seconds... cause we always do ¯\_(ツ)_/¯
    }
  });

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
      // TODO
    });
  });

  describe('when an index contains SO types that have been moved to another index', () => {
    it('executes the reindexing migration steps', () => {
      // TODO
    });
  });

  it('execute the excludeOnUpgrade hook', async () => {
    const afterCount = await getAggregatedTypesCount(kit.client, defaultKibanaIndex);
    // assert we filtered some documents
    const beforeCountComplex = baselineDocuments.filter(({ type }) => type === 'complex').length;
    expect(afterCount.complex).not.toEqual(beforeCountComplex);
    expect(afterCount).toMatchInlineSnapshot(`
      Object {
        "basic": 3,
        "complex": 2,
        "deprecated": 3,
      }
    `);
  });

  it('return a migrated status for each reindexed index', () => {
    // omit elapsedMs as it varies in each execution
    expect(migrationResults.map((result) => omit(result, 'elapsedMs'))).toMatchInlineSnapshot(`
      Array [
        Object {
          "destIndex": ".kibana_migrator_tests_9.1.0_001",
          "sourceIndex": ".kibana_migrator_tests_9.0.0_001",
          "status": "migrated",
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
