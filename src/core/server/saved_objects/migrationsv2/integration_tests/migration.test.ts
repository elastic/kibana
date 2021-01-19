/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { join } from 'path';
import Semver from 'semver';
import { REPO_ROOT } from '@kbn/dev-utils';
import { Env } from '@kbn/config';
import { getEnvOptions } from '@kbn/config/target/mocks';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { ElasticsearchClient } from '../../../elasticsearch';
import { SavedObjectsRawDoc } from '../../serialization';
import { InternalCoreStart } from '../../../internal_types';
import { Root } from '../../../root';

const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;

describe('migration v2', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: Root;
  let coreStart: InternalCoreStart;
  let esClient: ElasticsearchClient;

  const startServers = async ({ dataArchive, oss }: { dataArchive: string; oss: boolean }) => {
    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: oss ? 'oss' : 'trial',
          dataArchive,
        },
      },
    });

    root = kbnTestServer.createRootWithCorePlugins(
      {
        migrations: {
          skip: false,
          enableV2: true,
        },
        logging: {
          appenders: {
            file: {
              kind: 'file',
              path: join(__dirname, 'migration_test_kibana.log'),
              layout: {
                kind: 'json',
              },
            },
          },
          loggers: [
            {
              context: 'root',
              appenders: ['file'],
            },
          ],
        },
      },
      {
        oss,
      }
    );

    const startEsPromise = startES().then((es) => (esServer = es));
    const startKibanaPromise = root
      .setup()
      .then(() => root.start())
      .then((start) => {
        coreStart = start;
        esClient = coreStart.elasticsearch.client.asInternalUser;
      });

    await Promise.all([startEsPromise, startKibanaPromise]);
  };

  const getExpectedVersionPerType = () =>
    coreStart.savedObjects
      .getTypeRegistry()
      .getAllTypes()
      .reduce((versionMap, type) => {
        if (type.migrations) {
          const highestVersion = Object.keys(type.migrations).sort(Semver.compare).reverse()[0];
          return {
            ...versionMap,
            [type.name]: highestVersion,
          };
        } else {
          return {
            ...versionMap,
            [type.name]: undefined,
          };
        }
      }, {} as Record<string, string | undefined>);

  const assertMigrationVersion = (
    doc: SavedObjectsRawDoc,
    expectedVersions: Record<string, string | undefined>
  ) => {
    const migrationVersions = doc._source.migrationVersion;
    const type = doc._source.type;
    expect(migrationVersions ? migrationVersions[type] : undefined).toEqual(expectedVersions[type]);
  };

  const stopServers = async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  };

  // FLAKY: https://github.com/elastic/kibana/issues/87968
  describe.skip('migrating from 7.3.0-xpack version', () => {
    const migratedIndex = `.kibana_${kibanaVersion}_001`;

    beforeAll(async () => {
      await startServers({
        oss: false,
        dataArchive: join(__dirname, 'archives', '7.3.0_xpack_sample_saved_objects.zip'),
      });
    });

    afterAll(async () => {
      await stopServers();
    });

    it('creates the new index and the correct aliases', async () => {
      const { body } = await esClient.indices.get(
        {
          index: migratedIndex,
        },
        { ignore: [404] }
      );

      const response = body[migratedIndex];

      expect(response).toBeDefined();
      expect(Object.keys(response.aliases).sort()).toEqual(['.kibana', `.kibana_${kibanaVersion}`]);
    });

    it('copies all the document of the previous index to the new one', async () => {
      const migratedIndexResponse = await esClient.count({
        index: migratedIndex,
      });
      const oldIndexResponse = await esClient.count({
        index: '.kibana_1',
      });

      // Use a >= comparison since once Kibana has started it might create new
      // documents like telemetry tasks
      expect(migratedIndexResponse.body.count).toBeGreaterThanOrEqual(oldIndexResponse.body.count);
    });

    it('migrates the documents to the highest version', async () => {
      const expectedVersions = getExpectedVersionPerType();
      const res = await esClient.search({
        index: migratedIndex,
        sort: ['_doc'],
        size: 10000,
      });
      const allDocuments = res.body.hits.hits as SavedObjectsRawDoc[];
      allDocuments.forEach((doc) => {
        assertMigrationVersion(doc, expectedVersions);
      });
    });
  });

  describe('migrating from the same Kibana version', () => {
    const migratedIndex = `.kibana_${kibanaVersion}_001`;

    beforeAll(async () => {
      await startServers({
        oss: true,
        dataArchive: join(__dirname, 'archives', '8.0.0_oss_sample_saved_objects.zip'),
      });
    });

    afterAll(async () => {
      await stopServers();
    });

    it('creates the new index and the correct aliases', async () => {
      const { body } = await esClient.indices.get(
        {
          index: migratedIndex,
        },
        { ignore: [404] }
      );

      const response = body[migratedIndex];

      expect(response).toBeDefined();
      expect(Object.keys(response.aliases).sort()).toEqual(['.kibana', `.kibana_${kibanaVersion}`]);
    });

    it('copies all the document of the previous index to the new one', async () => {
      const migratedIndexResponse = await esClient.count({
        index: migratedIndex,
      });
      const oldIndexResponse = await esClient.count({
        index: '.kibana_1',
      });

      // Use a >= comparison since once Kibana has started it might create new
      // documents like telemetry tasks
      expect(migratedIndexResponse.body.count).toBeGreaterThanOrEqual(oldIndexResponse.body.count);
    });

    it('migrates the documents to the highest version', async () => {
      const expectedVersions = getExpectedVersionPerType();
      const res = await esClient.search({
        index: migratedIndex,
        sort: ['_doc'],
        size: 10000,
      });
      const allDocuments = res.body.hits.hits as SavedObjectsRawDoc[];
      allDocuments.forEach((doc) => {
        assertMigrationVersion(doc, expectedVersions);
      });
    });
  });
});
