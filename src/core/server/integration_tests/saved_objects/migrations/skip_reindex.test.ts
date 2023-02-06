/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KibanaMigrator } from '@kbn/core-saved-objects-migration-server-internal';
import { delay } from './test_utils';
import {
  checkLogContains,
  checkLogDoesNotContain,
  clearLog,
  createBaseline,
  currentVersion,
  defaultKibanaIndex,
  getCompatibleMappingsMigrator,
  getIdenticalMappingsMigrator,
  getIncompatibleMappingsMigrator,
  startElasticsearch,
} from './kibana_migrator_test_kit';

describe('when migrating to a new version', () => {
  let esServer: TestElasticsearchUtils['es'];
  let esClient: ElasticsearchClient;
  let migrator: KibanaMigrator;

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
      migrator = (await getIdenticalMappingsMigrator()).migrator;
      migrator.prepareMigrations();
      await migrator.runMigrations();

      await checkLogContains([
        'INIT -> WAIT_FOR_YELLOW_SOURCE.',
        'WAIT_FOR_YELLOW_SOURCE -> CLEANUP_UNKNOWN_AND_EXCLUDED.',
        'CLEANUP_UNKNOWN_AND_EXCLUDED -> PREPARE_COMPATIBLE_MIGRATION.',
        'PREPARE_COMPATIBLE_MIGRATION -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.',
        'CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS.',
        'CHECK_VERSION_INDEX_READY_ACTIONS -> DONE.',
      ]);

      await checkLogDoesNotContain([
        'CREATE_NEW_TARGET',
        'CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS.',
      ]);
    });
  });

  describe("and the mappings' changes are still compatible", () => {
    it('the migrator skips reindexing', async () => {
      // we run the migrator with altered, compatible mappings
      migrator = (await getCompatibleMappingsMigrator()).migrator;
      migrator.prepareMigrations();
      await migrator.runMigrations();

      await checkLogContains([
        'INIT -> WAIT_FOR_YELLOW_SOURCE.',
        'WAIT_FOR_YELLOW_SOURCE -> CHECK_COMPATIBLE_MAPPINGS.',
        'CHECK_COMPATIBLE_MAPPINGS -> CLEANUP_UNKNOWN_AND_EXCLUDED.',
        'CLEANUP_UNKNOWN_AND_EXCLUDED -> PREPARE_COMPATIBLE_MIGRATION.',
        'PREPARE_COMPATIBLE_MIGRATION -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.',
        'CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS.',
        'UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.',
        'CHECK_VERSION_INDEX_READY_ACTIONS -> DONE.',
      ]);

      await checkLogDoesNotContain(['CREATE_NEW_TARGET', 'CHECK_UNKNOWN_DOCUMENTS.', 'REINDEX']);
    });
  });

  describe("and the mappings' changes are NOT compatible", () => {
    it('the migrator reindexes documents to a new index', async () => {
      // we run the migrator with altered, compatible mappings
      migrator = (await getIncompatibleMappingsMigrator()).migrator;
      migrator.prepareMigrations();
      await migrator.runMigrations();

      await checkLogContains([
        'INIT -> WAIT_FOR_YELLOW_SOURCE.',
        'WAIT_FOR_YELLOW_SOURCE -> CHECK_COMPATIBLE_MAPPINGS.',
        'CHECK_COMPATIBLE_MAPPINGS -> CHECK_UNKNOWN_DOCUMENTS.',
        'CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS.',
        'UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.',
        'CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY.',
        'MARK_VERSION_INDEX_READY -> DONE.',
      ]);

      await checkLogDoesNotContain([
        'CREATE_NEW_TARGET',
        'CLEANUP_UNKNOWN_AND_EXCLUDED.',
        'PREPARE_COMPATIBLE_MIGRATION.',
      ]);
    });
  });

  afterEach(async () => {
    // we run the migrator again to ensure that the next time state is loaded everything still works as expected
    await clearLog();
    await migrator.runMigrations({ rerun: true });
    await checkLogContains([
      'INIT -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
      'CHECK_VERSION_INDEX_READY_ACTIONS -> DONE.',
    ]);

    await checkLogDoesNotContain([
      'WAIT_FOR_YELLOW_SOURCE',
      'CLEANUP_UNKNOWN_AND_EXCLUCED',
      'PREPARE_COMPATIBLE_MIGRATION',
      'UPDATE_TARGET_MAPPINGS',
    ]);

    // clear the system index for next test
    await esClient?.indices.delete({ index: `${defaultKibanaIndex}_${currentVersion}_001` });
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });
});
