/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import { SemVer } from 'semver';
import { Env } from '@kbn/config';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { getEnvOptions } from '@kbn/config-mocks';
import { REPO_ROOT } from '@kbn/repo-info';
import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { getKibanaMigratorTestKit } from '../kibana_migrator_test_kit';
import { baselineDocuments, baselineTypes } from './active_delete.fixtures';
import { delay } from '../test_utils';

const kibanaIndex = '.kibana_migrator_tests';
export const logFilePath = Path.join(__dirname, 'active_delete.test.log');
const currentVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
const nextMinor = new SemVer(currentVersion).inc('minor').format();

describe('when upgrading to a new stack version', () => {
  let esServer: TestElasticsearchUtils['es'];
  let esClient: ElasticsearchClient;

  const startElasticsearch = async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
        },
      },
    });
    return await startES();
  };

  const createBaseline = async () => {
    const { client, runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
      kibanaIndex,
      types: baselineTypes,
    });

    await runMigrations();

    await savedObjectsRepository.bulkCreate(baselineDocuments, {
      refresh: 'wait_for',
    });

    return client;
  };

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });

  describe('and the mappings match (diffMappings() === false)', () => {
    describe('and discardUnknownObjects = true', () => {
      let indexContents: SearchResponse<{ type: string }, Record<string, AggregationsAggregate>>;

      beforeAll(async () => {
        esClient = await createBaseline();

        await fs.unlink(logFilePath).catch(() => {});
        // remove the 'deprecated' type from the mappings, so that it is considered unknown
        const types = baselineTypes.filter((type) => type.name !== 'deprecated');
        const { client, runMigrations } = await getKibanaMigratorTestKit({
          settings: {
            migrations: {
              discardUnknownObjects: nextMinor,
            },
          },
          kibanaIndex,
          types,
          kibanaVersion: nextMinor,
          logFilePath,
        });

        await runMigrations();

        indexContents = await client.search({ index: kibanaIndex, size: 100 });
      });

      afterAll(async () => {
        await esClient?.indices.delete({ index: `${kibanaIndex}_${currentVersion}_001` });
      });

      it('the migrator is skipping reindex operation and executing CLEANUP_UNKNOWN_AND_EXCLUDED step', async () => {
        const logs = await fs.readFile(logFilePath, 'utf-8');
        expect(logs).toMatch('[.kibana_migrator_tests] INIT -> WAIT_FOR_YELLOW_SOURCE');
        expect(logs).toMatch(
          '[.kibana_migrator_tests] WAIT_FOR_YELLOW_SOURCE -> CLEANUP_UNKNOWN_AND_EXCLUDED'
        );
        // we gotta inform that we are deleting unknown documents too (discardUnknownObjects: true)
        expect(logs).toMatch(
          '[.kibana_migrator_tests] Kibana has been configured to discard unknown documents for this migration.'
        );

        expect(logs).toMatch(
          'Therefore, the following documents with unknown types will not be taken into account and they will not be available after the migration:'
        );
        expect(logs).toMatch(
          '[.kibana_migrator_tests] CLEANUP_UNKNOWN_AND_EXCLUDED -> CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK'
        );
        expect(logs).toMatch(
          '[.kibana_migrator_tests] CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK -> PREPARE_COMPATIBLE_MIGRATION'
        );
        expect(logs).toMatch(
          '[.kibana_migrator_tests] PREPARE_COMPATIBLE_MIGRATION -> REFRESH_TARGET'
        );
        expect(logs).toMatch(
          '[.kibana_migrator_tests] REFRESH_TARGET -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'
        );
        expect(logs).toMatch(
          '[.kibana_migrator_tests] CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS'
        );
        expect(logs).toMatch('[.kibana_migrator_tests] CHECK_VERSION_INDEX_READY_ACTIONS -> DONE');
      });

      describe('CLEANUP_UNKNOWN_AND_EXCLUDED', () => {
        it('preserves documents with known types', async () => {
          const basicDocumentCount = indexContents.hits.hits.filter(
            (result) => result._source?.type === 'basic'
          ).length;

          expect(basicDocumentCount).toEqual(3);
        });

        it('deletes documents with unknown types', async () => {
          const deprecatedDocumentCount = indexContents.hits.hits.filter(
            (result) => result._source?.type === 'deprecated'
          ).length;

          expect(deprecatedDocumentCount).toEqual(0);
        });

        it('deletes documents that belong to REMOVED_TYPES', async () => {
          const serverDocumentCount = indexContents.hits.hits.filter(
            (result) => result._source?.type === 'server'
          ).length;

          expect(serverDocumentCount).toEqual(0);
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
        await esClient?.indices.delete({ index: `${kibanaIndex}_${currentVersion}_001` });
      });
      beforeEach(async () => {
        await fs.unlink(logFilePath).catch(() => {});
      });

      it('fails if unknown documents exist', async () => {
        // remove the 'deprecated' type from the mappings, so that SO of this type are considered unknown
        const types = baselineTypes.filter((type) => type.name !== 'deprecated');
        const { runMigrations } = await getKibanaMigratorTestKit({
          kibanaIndex,
          types,
          kibanaVersion: nextMinor,
          logFilePath,
        });

        try {
          await runMigrations();
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

        const logs = await fs.readFile(logFilePath, 'utf-8');
        expect(logs).toMatch('[.kibana_migrator_tests] INIT -> WAIT_FOR_YELLOW_SOURCE');
        expect(logs).toMatch(
          '[.kibana_migrator_tests] WAIT_FOR_YELLOW_SOURCE -> CLEANUP_UNKNOWN_AND_EXCLUDED'
        );
        expect(logs).toMatch('[.kibana_migrator_tests] CLEANUP_UNKNOWN_AND_EXCLUDED -> FATAL');
      });

      it('proceeds if there are no unknown documents', async () => {
        const { client, runMigrations } = await getKibanaMigratorTestKit({
          kibanaIndex,
          types: baselineTypes,
          kibanaVersion: nextMinor,
          logFilePath,
        });

        await runMigrations();

        const logs = await fs.readFile(logFilePath, 'utf-8');
        expect(logs).toMatch('[.kibana_migrator_tests] INIT -> WAIT_FOR_YELLOW_SOURCE');
        expect(logs).toMatch(
          '[.kibana_migrator_tests] WAIT_FOR_YELLOW_SOURCE -> CLEANUP_UNKNOWN_AND_EXCLUDED'
        );
        expect(logs).toMatch(
          '[.kibana_migrator_tests] CLEANUP_UNKNOWN_AND_EXCLUDED -> CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK'
        );
        expect(logs).toMatch(
          '[.kibana_migrator_tests] CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK -> PREPARE_COMPATIBLE_MIGRATION'
        );
        expect(logs).toMatch(
          '[.kibana_migrator_tests] PREPARE_COMPATIBLE_MIGRATION -> REFRESH_TARGET'
        );
        expect(logs).toMatch(
          '[.kibana_migrator_tests] REFRESH_TARGET -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'
        );
        expect(logs).toMatch(
          '[.kibana_migrator_tests] CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS'
        );
        expect(logs).toMatch('[.kibana_migrator_tests] CHECK_VERSION_INDEX_READY_ACTIONS -> DONE');

        const indexContents = await client.search({ index: kibanaIndex, size: 100 });

        expect(indexContents.hits.hits.length).toEqual(8);
      });
    });
  });

  describe('and the mappings do NOT match (diffMappings() === true)', () => {
    beforeAll(async () => {
      esClient = await createBaseline();
    });
    afterAll(async () => {
      await esClient?.indices.delete({ index: `${kibanaIndex}_${currentVersion}_001` });
    });
    beforeEach(async () => {
      await fs.unlink(logFilePath).catch(() => {});
    });

    it('the migrator does not skip reindexing', async () => {
      const incompatibleTypes: Array<SavedObjectsType<any>> = baselineTypes.map((type) => {
        if (type.name === 'complex') {
          return {
            ...type,
            mappings: {
              properties: {
                name: { type: 'keyword' }, // text => keyword
                value: { type: 'long' }, // integer => long
              },
            },
          };
        } else {
          return type;
        }
      });

      const { client, runMigrations } = await getKibanaMigratorTestKit({
        kibanaIndex,
        types: incompatibleTypes,
        kibanaVersion: nextMinor,
        logFilePath,
      });

      await runMigrations();

      const logs = await fs.readFile(logFilePath, 'utf-8');
      expect(logs).toMatch('[.kibana_migrator_tests] INIT -> WAIT_FOR_YELLOW_SOURCE');
      expect(logs).toMatch(
        '[.kibana_migrator_tests] WAIT_FOR_YELLOW_SOURCE -> CHECK_UNKNOWN_DOCUMENTS.'
      );
      expect(logs).toMatch(
        '[.kibana_migrator_tests] CHECK_UNKNOWN_DOCUMENTS -> SET_SOURCE_WRITE_BLOCK.'
      );
      expect(logs).toMatch(
        '[.kibana_migrator_tests] CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS.'
      );
      expect(logs).toMatch(
        '[.kibana_migrator_tests] UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.'
      );
      expect(logs).toMatch(
        '[.kibana_migrator_tests] CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY.'
      );
      expect(logs).toMatch('[.kibana_migrator_tests] MARK_VERSION_INDEX_READY -> DONE');

      const indexContents: SearchResponse<
        { type: string },
        Record<string, AggregationsAggregate>
      > = await client.search({ index: kibanaIndex, size: 100 });

      expect(indexContents.hits.hits.length).toEqual(8); // we're removing a couple of 'complex' (value < = 1)

      // double-check that the deprecated documents have not been deleted
      const deprecatedDocumentCount = indexContents.hits.hits.filter(
        (result) => result._source?.type === 'deprecated'
      ).length;
      expect(deprecatedDocumentCount).toEqual(3);
    });
  });
});
