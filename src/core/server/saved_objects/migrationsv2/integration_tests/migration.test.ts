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

const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;

describe('migration v2', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let kibanaServer: kbnTestServer.TestKibanaUtils;
  let esClient: ElasticsearchClient;

  const startServers = async (dataArchivePath: string) => {
    const { startES, startKibana } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'oss',
          dataArchive: dataArchivePath,
        },
        kbn: {
          migrations: {
            skip: false,
            enableV2: true,
          },
        },
      },
    });
    esServer = await startES();
    kibanaServer = await startKibana();
    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
  };

  const getExpectedVersionPerType = () =>
    kibanaServer.coreStart.savedObjects
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
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  };

  describe('migrating from the same Kibana version', () => {
    const migratedIndex = `.kibana_${kibanaVersion}_001`;

    beforeAll(async () => {
      await startServers(join(__dirname, 'archives', 'sample_data_only_8.0.zip'));
    });

    afterAll(async () => {
      await stopServers();
    });

    it('creates the new index and the correct aliases', async () => {
      const { body } = await esClient.indices.get(
        {
          index: migratedIndex,
        },
        { ignore: [404], maxRetries: 0 }
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

      expect(migratedIndexResponse.body.count).toEqual(oldIndexResponse.body.count);
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
