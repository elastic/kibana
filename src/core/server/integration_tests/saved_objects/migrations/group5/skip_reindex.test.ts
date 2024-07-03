/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  readLog,
  clearLog,
  createBaseline,
  currentVersion,
  defaultKibanaIndex,
  getCompatibleMappingsMigrator,
  getIdenticalMappingsMigrator,
  getIncompatibleMappingsMigrator,
  startElasticsearch,
  KibanaMigratorTestKit,
} from '../kibana_migrator_test_kit';
import { delay } from '../test_utils';

describe('when migrating to a new version', () => {
  let esServer: TestElasticsearchUtils['es'];
  let esClient: ElasticsearchClient;
  let migratorTestKitFactory: () => Promise<KibanaMigratorTestKit>;

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  beforeEach(async () => {
    esClient = await createBaseline();
    await clearLog();
  });

  describe('and the mappings remain the same', () => {
    it('the migrator skips reindexing', async () => {
      // we run the migrator with the same identic baseline types
      migratorTestKitFactory = () => getIdenticalMappingsMigrator();
      const testKit = await migratorTestKitFactory();
      await testKit.runMigrations();

      const logs = await readLog();
      expect(logs).toMatch('INIT -> WAIT_FOR_YELLOW_SOURCE.');
      expect(logs).toMatch('WAIT_FOR_YELLOW_SOURCE -> UPDATE_SOURCE_MAPPINGS_PROPERTIES.');
      expect(logs).toMatch('UPDATE_SOURCE_MAPPINGS_PROPERTIES -> CLEANUP_UNKNOWN_AND_EXCLUDED.');
      expect(logs).toMatch(
        'CLEANUP_UNKNOWN_AND_EXCLUDED -> CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.'
      );
      expect(logs).toMatch(
        'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK -> PREPARE_COMPATIBLE_MIGRATION.'
      );
      expect(logs).toMatch('PREPARE_COMPATIBLE_MIGRATION -> REFRESH_SOURCE.');
      expect(logs).toMatch('REFRESH_SOURCE -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.');
      expect(logs).toMatch('CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS.');
      expect(logs).toMatch('CHECK_VERSION_INDEX_READY_ACTIONS -> DONE.');

      expect(logs).not.toMatch('CREATE_NEW_TARGET');
      expect(logs).not.toMatch('CHECK_UNKNOWN_DOCUMENTS');
      expect(logs).not.toMatch('REINDEX');
      expect(logs).not.toMatch('UPDATE_TARGET_MAPPINGS_PROPERTIES');
    });
  });

  describe("and the mappings' changes are still compatible", () => {
    it('the migrator skips reindexing', async () => {
      // we run the migrator with altered, compatible mappings
      migratorTestKitFactory = () => getCompatibleMappingsMigrator();
      const testKit = await migratorTestKitFactory();
      await testKit.runMigrations();

      const logs = await readLog();
      expect(logs).toMatch('INIT -> WAIT_FOR_YELLOW_SOURCE.');
      expect(logs).toMatch('WAIT_FOR_YELLOW_SOURCE -> UPDATE_SOURCE_MAPPINGS_PROPERTIES.');
      expect(logs).toMatch('UPDATE_SOURCE_MAPPINGS_PROPERTIES -> CLEANUP_UNKNOWN_AND_EXCLUDED.');
      expect(logs).toMatch(
        'CLEANUP_UNKNOWN_AND_EXCLUDED -> CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.'
      );
      expect(logs).toMatch(
        'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK -> PREPARE_COMPATIBLE_MIGRATION.'
      );
      expect(logs).toMatch('PREPARE_COMPATIBLE_MIGRATION -> REFRESH_SOURCE.');
      expect(logs).toMatch('REFRESH_SOURCE -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.');
      expect(logs).toMatch('CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_PROPERTIES.');
      expect(logs).toMatch('UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.');
      expect(logs).toMatch('CHECK_VERSION_INDEX_READY_ACTIONS -> DONE.');

      expect(logs).not.toMatch('CREATE_NEW_TARGET');
      expect(logs).not.toMatch('CHECK_UNKNOWN_DOCUMENTS');
      expect(logs).not.toMatch('REINDEX');
    });
  });

  describe("and the mappings' changes are NOT compatible", () => {
    it('the migrator reindexes documents to a new index', async () => {
      // we run the migrator with incompatible mappings
      migratorTestKitFactory = () => getIncompatibleMappingsMigrator();
      const testKit = await migratorTestKitFactory();
      await testKit.runMigrations();

      const logs = await readLog();
      expect(logs).toMatch('INIT -> WAIT_FOR_YELLOW_SOURCE.');
      expect(logs).toMatch('WAIT_FOR_YELLOW_SOURCE -> UPDATE_SOURCE_MAPPINGS_PROPERTIES.');
      expect(logs).toMatch(
        'UPDATE_SOURCE_MAPPINGS_PROPERTIES -> CHECK_CLUSTER_ROUTING_ALLOCATION.'
      );
      expect(logs).toMatch('CHECK_CLUSTER_ROUTING_ALLOCATION -> CHECK_UNKNOWN_DOCUMENTS.');
      expect(logs).toMatch('CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_PROPERTIES.');
      expect(logs).toMatch('UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.');
      expect(logs).toMatch('CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY.');
      expect(logs).toMatch('MARK_VERSION_INDEX_READY -> DONE.');

      expect(logs).not.toMatch('CREATE_NEW_TARGET');
      expect(logs).not.toMatch('CLEANUP_UNKNOWN_AND_EXCLUDED');
      expect(logs).not.toMatch('PREPARE_COMPATIBLE_MIGRATION');
    });
  });

  afterEach(async () => {
    // we run the migrator again to ensure that the next time state is loaded everything still works as expected
    const migratorTestKit = await migratorTestKitFactory();
    await clearLog();
    await migratorTestKit.runMigrations();

    const logs = await readLog();
    expect(logs).toMatch('INIT -> WAIT_FOR_YELLOW_SOURCE.');
    expect(logs).toMatch('WAIT_FOR_YELLOW_SOURCE -> UPDATE_SOURCE_MAPPINGS_PROPERTIES.');
    expect(logs).toMatch(
      'UPDATE_SOURCE_MAPPINGS_PROPERTIES -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.'
    );
    expect(logs).toMatch('CHECK_VERSION_INDEX_READY_ACTIONS -> DONE.');

    expect(logs).not.toMatch('CLEANUP_UNKNOWN_AND_EXCLUCED');
    expect(logs).not.toMatch('CREATE_NEW_TARGET');
    expect(logs).not.toMatch('PREPARE_COMPATIBLE_MIGRATION');
    expect(logs).not.toMatch('UPDATE_TARGET_MAPPINGS_PROPERTIES');

    // clear the system index for next test
    await esClient?.indices.delete({ index: `${defaultKibanaIndex}_${currentVersion}_001` });
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });
});
