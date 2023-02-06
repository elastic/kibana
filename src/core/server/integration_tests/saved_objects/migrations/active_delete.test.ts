/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  checkLogContains,
  clearLog,
  createBaseline,
  currentVersion,
  defaultKibanaIndex,
  getCompatibleMappingsMigrator,
  getIdenticalMappingsMigrator,
  getIncompatibleMappingsMigrator,
  getNonDeprecatedMappingsMigrator,
  nextMinor,
  startElasticsearch,
} from './kibana_migrator_test_kit';
import { delay } from './test_utils';

describe('when upgrading to a new stack version', () => {
  let esServer: TestElasticsearchUtils['es'];
  let esClient: ElasticsearchClient;

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });

  describe('if the mappings match (diffMappings() === false)', () => {
    describe('and discardUnknownObjects = true', () => {
      let indexContents: SearchResponse<{ type: string }, Record<string, AggregationsAggregate>>;

      beforeAll(async () => {
        esClient = await createBaseline();

        await clearLog();
        // remove the 'deprecated' type from the mappings, so that it is considered unknown
        const { migrator, client } = await getNonDeprecatedMappingsMigrator({
          settings: {
            migrations: {
              discardUnknownObjects: nextMinor,
            },
          },
        });

        migrator.prepareMigrations();
        await migrator.runMigrations();

        indexContents = await client.search({ index: defaultKibanaIndex, size: 100 });
      });

      afterAll(async () => {
        await esClient?.indices.delete({ index: `${defaultKibanaIndex}_${currentVersion}_001` });
      });

      it('the migrator is skipping reindex operation and executing CLEANUP_UNKNOWN_AND_EXCLUDED step', async () => {
        checkLogContains([
          'INIT -> WAIT_FOR_YELLOW_SOURCE.',
          'WAIT_FOR_YELLOW_SOURCE -> CLEANUP_UNKNOWN_AND_EXCLUDED.',
          // we gotta inform that we are deleting unknown documents too (discardUnknownObjects: true),
          'Kibana has been configured to discard unknown documents for this migration.',
          'Therefore, the following documents with unknown types will not be taken into account and they will not be available after the migration:',
          'CLEANUP_UNKNOWN_AND_EXCLUDED -> PREPARE_COMPATIBLE_MIGRATION.',
          'PREPARE_COMPATIBLE_MIGRATION -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.',
          'CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS.',
          'CHECK_VERSION_INDEX_READY_ACTIONS -> DONE.',
        ]);
      });

      describe('CLEANUP_UNKNOWN_AND_EXCLUDED', () => {
        it('preserves documents with known types', async () => {
          expect(countResultsByType(indexContents, 'basic')).toEqual(3);
        });

        it('deletes documents with unknown types', async () => {
          expect(countResultsByType(indexContents, 'deprecated')).toEqual(0);
        });

        it('deletes documents that belong to REMOVED_TYPES', async () => {
          expect(countResultsByType(indexContents, 'server')).toEqual(0);
        });

        it("deletes documents that have been excludeOnUpgrade'd via plugin hook", async () => {
          const complexDocuments = indexContents.hits.hits.filter(
            (result) => result._source?.type === 'complex'
          );

          expect(complexDocuments.length).toEqual(2);
          expect(complexDocuments[0]._source).toEqual(
            expect.objectContaining({
              complex: {
                name: 'complex-baz',
                value: 2,
              },
              type: 'complex',
            })
          );
          expect(complexDocuments[1]._source).toEqual(
            expect.objectContaining({
              complex: {
                name: 'complex-lipsum',
                value: 3,
              },
              type: 'complex',
            })
          );
        });
      });
    });

    describe('and discardUnknownObjects = false', () => {
      beforeAll(async () => {
        esClient = await createBaseline();
      });
      afterAll(async () => {
        await esClient?.indices.delete({ index: `${defaultKibanaIndex}_${currentVersion}_001` });
      });
      beforeEach(async () => {
        await clearLog();
      });

      it('fails if unknown documents exist', async () => {
        // remove the 'deprecated' type from the mappings, so that it is considered unknown
        const { migrator } = await getNonDeprecatedMappingsMigrator();

        migrator.prepareMigrations();

        try {
          await migrator.runMigrations();
        } catch (err) {
          const errorMessage = err.message;
          expect(errorMessage).toMatch(
            'Unable to complete saved object migrations for the [.kibana_migrator_tests] index: Migration failed because some documents were found which use unknown saved object types:'
          );
          expect(errorMessage).toMatch(
            'To proceed with the migration you can configure Kibana to discard unknown saved objects for this migration.'
          );
          expect(errorMessage).toMatch(/deprecated:.*\(type: "deprecated"\)/);
        }

        checkLogContains([
          'INIT -> WAIT_FOR_YELLOW_SOURCE.',
          'WAIT_FOR_YELLOW_SOURCE -> CLEANUP_UNKNOWN_AND_EXCLUDED.',
          'CLEANUP_UNKNOWN_AND_EXCLUDED -> FATAL.',
        ]);
      });

      it('proceeds if there are no unknown documents', async () => {
        const { migrator, client } = await getIdenticalMappingsMigrator();

        migrator.prepareMigrations();
        await migrator.runMigrations();

        checkLogContains([
          'INIT -> WAIT_FOR_YELLOW_SOURCE.',
          'WAIT_FOR_YELLOW_SOURCE -> CLEANUP_UNKNOWN_AND_EXCLUDED.',
          'CLEANUP_UNKNOWN_AND_EXCLUDED -> PREPARE_COMPATIBLE_MIGRATION.',
          'PREPARE_COMPATIBLE_MIGRATION -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.',
          'CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS.',
          'CHECK_VERSION_INDEX_READY_ACTIONS -> DONE.',
        ]);

        const indexContents = await client.search({ index: defaultKibanaIndex, size: 100 });

        expect(indexContents.hits.hits.length).toEqual(8);
      });
    });
  });

  describe('if the mappings are compatible', () => {
    describe('and discardUnknownObjects = true', () => {
      let indexContents: SearchResponse<{ type: string }, Record<string, AggregationsAggregate>>;

      beforeAll(async () => {
        esClient = await createBaseline();

        await clearLog();
        const { migrator, client } = await getCompatibleMappingsMigrator({
          filterDeprecated: true, // remove the 'deprecated' type from the mappings, so that it is considered unknown
          settings: {
            migrations: {
              discardUnknownObjects: nextMinor,
            },
          },
        });

        migrator.prepareMigrations();
        await migrator.runMigrations();

        indexContents = await client.search({ index: defaultKibanaIndex, size: 100 });
      });

      afterAll(async () => {
        await esClient?.indices.delete({ index: `${defaultKibanaIndex}_${currentVersion}_001` });
      });

      it('the migrator is skipping reindex operation and executing CLEANUP_UNKNOWN_AND_EXCLUDED step', async () => {
        checkLogContains([
          'INIT -> WAIT_FOR_YELLOW_SOURCE.',
          'WAIT_FOR_YELLOW_SOURCE -> CHECK_COMPATIBLE_MAPPINGS.', // this step is run only if mappings are compatible but NOT equal
          'CHECK_COMPATIBLE_MAPPINGS -> CLEANUP_UNKNOWN_AND_EXCLUDED.',
          // we gotta inform that we are deleting unknown documents too (discardUnknownObjects: true),
          'Kibana has been configured to discard unknown documents for this migration.',
          'Therefore, the following documents with unknown types will not be taken into account and they will not be available after the migration:',
          'CLEANUP_UNKNOWN_AND_EXCLUDED -> PREPARE_COMPATIBLE_MIGRATION.',
          'PREPARE_COMPATIBLE_MIGRATION -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.',
          'CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS.',
          'UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.',
          'CHECK_VERSION_INDEX_READY_ACTIONS -> DONE.',
        ]);
      });

      describe('CLEANUP_UNKNOWN_AND_EXCLUDED', () => {
        it('preserves documents with known types', async () => {
          expect(countResultsByType(indexContents, 'basic')).toEqual(3);
        });

        it('deletes documents with unknown types', async () => {
          expect(countResultsByType(indexContents, 'deprecated')).toEqual(0);
        });

        it('deletes documents that belong to REMOVED_TYPES', async () => {
          expect(countResultsByType(indexContents, 'server')).toEqual(0);
        });

        it("deletes documents that have been excludeOnUpgrade'd via plugin hook", async () => {
          const complexDocuments = indexContents.hits.hits.filter(
            (result) => result._source?.type === 'complex'
          );

          expect(complexDocuments.length).toEqual(2);
          expect(complexDocuments[0]._source).toEqual(
            expect.objectContaining({
              complex: {
                name: 'complex-baz',
                value: 2,
              },
              type: 'complex',
            })
          );
          expect(complexDocuments[1]._source).toEqual(
            expect.objectContaining({
              complex: {
                name: 'complex-lipsum',
                value: 3,
              },
              type: 'complex',
            })
          );
        });
      });
    });

    describe('and discardUnknownObjects = false', () => {
      beforeAll(async () => {
        esClient = await createBaseline();
      });
      afterAll(async () => {
        await esClient?.indices.delete({ index: `${defaultKibanaIndex}_${currentVersion}_001` });
      });
      beforeEach(async () => {
        await clearLog();
      });

      it('fails if unknown documents exist', async () => {
        const { migrator } = await getCompatibleMappingsMigrator({
          filterDeprecated: true, // remove the 'deprecated' type from the mappings, so that it is considered unknown
        });

        migrator.prepareMigrations();

        try {
          await migrator.runMigrations();
        } catch (err) {
          const errorMessage = err.message;
          expect(errorMessage).toMatch(
            'Unable to complete saved object migrations for the [.kibana_migrator_tests] index: Migration failed because some documents were found which use unknown saved object types:'
          );
          expect(errorMessage).toMatch(
            'To proceed with the migration you can configure Kibana to discard unknown saved objects for this migration.'
          );
          expect(errorMessage).toMatch(/deprecated:.*\(type: "deprecated"\)/);
        }

        checkLogContains([
          'INIT -> WAIT_FOR_YELLOW_SOURCE.',
          'WAIT_FOR_YELLOW_SOURCE -> CHECK_COMPATIBLE_MAPPINGS.', // this step is run only if mappings are compatible but NOT equal
          'CHECK_COMPATIBLE_MAPPINGS -> CLEANUP_UNKNOWN_AND_EXCLUDED.',
          'CLEANUP_UNKNOWN_AND_EXCLUDED -> FATAL.',
        ]);
      });

      it('proceeds if there are no unknown documents', async () => {
        const { migrator, client } = await getCompatibleMappingsMigrator();

        migrator.prepareMigrations();
        await migrator.runMigrations();

        checkLogContains([
          'INIT -> WAIT_FOR_YELLOW_SOURCE.',
          'WAIT_FOR_YELLOW_SOURCE -> CHECK_COMPATIBLE_MAPPINGS.', // this step is run only if mappings are compatible but NOT equal
          'CHECK_COMPATIBLE_MAPPINGS -> CLEANUP_UNKNOWN_AND_EXCLUDED.',
          'CLEANUP_UNKNOWN_AND_EXCLUDED -> PREPARE_COMPATIBLE_MIGRATION.',
          'PREPARE_COMPATIBLE_MIGRATION -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.',
          'CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS.',
          'UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.',
          'CHECK_VERSION_INDEX_READY_ACTIONS -> DONE.',
        ]);

        const indexContents = await client.search({ index: defaultKibanaIndex, size: 100 });

        expect(indexContents.hits.hits.length).toEqual(8);
      });
    });
  });

  describe('if the mappings do NOT match (diffMappings() === true)', () => {
    beforeAll(async () => {
      esClient = await createBaseline();
    });
    afterAll(async () => {
      await esClient?.indices.delete({ index: `${defaultKibanaIndex}_${currentVersion}_001` });
    });
    beforeEach(async () => {
      await clearLog();
    });

    it('the migrator does not skip reindexing', async () => {
      const { migrator, client } = await getIncompatibleMappingsMigrator();

      migrator.prepareMigrations();
      await migrator.runMigrations();

      checkLogContains([
        'INIT -> WAIT_FOR_YELLOW_SOURCE',
        'WAIT_FOR_YELLOW_SOURCE -> CHECK_COMPATIBLE_MAPPINGS.',
        'CHECK_COMPATIBLE_MAPPINGS -> CHECK_UNKNOWN_DOCUMENTS.',
        'CHECK_UNKNOWN_DOCUMENTS -> SET_SOURCE_WRITE_BLOCK.',
        'CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS.',
        'UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.',
        'CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY.',
        'MARK_VERSION_INDEX_READY -> DONE',
      ]);

      const indexContents: SearchResponse<
        { type: string },
        Record<string, AggregationsAggregate>
      > = await client.search({ index: defaultKibanaIndex, size: 100 });

      // we have just deleted the 2 excluded complex types (see fixtures)
      expect(indexContents.hits.hits.length).toEqual(8);

      // double-check that the deprecated documents have not been deleted
      expect(countResultsByType(indexContents, 'deprecated')).toEqual(3);
    });
  });
});

const countResultsByType = (
  indexContents: SearchResponse<{ type: string }, Record<string, AggregationsAggregate>>,
  type: string
): number => {
  return indexContents.hits.hits.filter((result) => result._source?.type === type).length;
};
