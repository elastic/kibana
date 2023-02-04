/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import { Env } from '@kbn/config';
import { getEnvOptions } from '@kbn/config-mocks';
import { REPO_ROOT } from '@kbn/repo-info';
import { createTestServers, TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getKibanaMigratorTestKit } from './kibana_migrator_test_kit';
import { baselineDocuments, baselineTypes } from './active_delete.fixtures';
import { delay } from './test_utils';
import { SemVer } from 'semver';
import { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';

const kibanaIndex = '.kibana_migrator_tests';
export const logFilePath = Path.join(__dirname, 'active_delete.test.log');
const currentVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;

describe('active delete', () => {
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
    const { client, migrator, savedObjectsRepository } = await getKibanaMigratorTestKit({
      kibanaIndex,
      types: baselineTypes,
    });

    migrator.prepareMigrations();
    await migrator.runMigrations();

    await savedObjectsRepository.bulkCreate(baselineDocuments, {
      refresh: 'wait_for',
    });

    return client;
  };

  beforeAll(async () => {
    esServer = await startElasticsearch();
    esClient = await createBaseline();
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });

  describe('when upgrading to a new stack version with matching mappings', () => {
    let indexContents: SearchResponse<{ type: string }, Record<string, AggregationsAggregate>>;

    beforeAll(async () => {
      await fs.unlink(logFilePath).catch(() => {});
      const kibanaVersion = new SemVer(currentVersion).inc('minor').format();
      // remove the 'deprecated' type from the mappings, so that it is considered unknown
      const types = baselineTypes.filter((type) => type.name !== 'deprecated');
      const { migrator, client } = await getKibanaMigratorTestKit({
        settings: {
          migrations: {
            discardUnknownObjects: kibanaVersion,
          },
        },
        kibanaIndex,
        types,
        kibanaVersion,
        logFilePath,
      });

      migrator.prepareMigrations();
      await migrator.runMigrations();

      indexContents = await client.search({ index: kibanaIndex, size: 1000 });
    });

    afterAll(async () => {
      await esClient?.indices.delete({ index: `${kibanaIndex}_${currentVersion}_001` });
    });

    it('detects that the mappings match, skips reindexing and performs active cleanup', async () => {
      const logs = await fs.readFile(logFilePath, 'utf-8');
      expect(logs).toMatch('[.kibana_migrator_tests] INIT -> WAIT_FOR_YELLOW_SOURCE');
      expect(logs).toMatch(
        '[.kibana_migrator_tests] WAIT_FOR_YELLOW_SOURCE -> CLEANUP_UNKNOWN_AND_EXCLUDED'
      );
      expect(logs).toMatch(
        '[.kibana_migrator_tests] CLEANUP_UNKNOWN_AND_EXCLUDED -> PREPARE_COMPATIBLE_MIGRATION'
      );
      expect(logs).toMatch(
        '[.kibana_migrator_tests] PREPARE_COMPATIBLE_MIGRATION -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'
      );
      expect(logs).toMatch(
        '[.kibana_migrator_tests] CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS'
      );
      expect(logs).toMatch('[.kibana_migrator_tests] CHECK_VERSION_INDEX_READY_ACTIONS -> DONE');
    });

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
  });
});
