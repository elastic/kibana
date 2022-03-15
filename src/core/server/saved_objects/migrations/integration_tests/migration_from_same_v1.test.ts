/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import Util from 'util';
import Semver from 'semver';
import { REPO_ROOT } from '@kbn/utils';
import { Env } from '@kbn/config';
import { getEnvOptions } from '../../../config/mocks';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { ElasticsearchClient } from '../../../elasticsearch';
import { SavedObjectsRawDoc } from '../../serialization';
import { InternalCoreStart } from '../../../internal_types';
import { Root } from '../../../root';

const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;

const logFilePath = Path.join(__dirname, 'migration_from_same_v1.log');

const asyncUnlink = Util.promisify(Fs.unlink);
async function removeLogFile() {
  // ignore errors if it doesn't exist
  await asyncUnlink(logFilePath).catch(() => void 0);
}
const assertMigratedDocuments = (arr: any[], target: any[]) => target.every((v) => arr.includes(v));

function sortByTypeAndId(a: { type: string; id: string }, b: { type: string; id: string }) {
  return a.type.localeCompare(b.type) || a.id.localeCompare(b.id);
}

async function fetchDocuments(esClient: ElasticsearchClient, index: string) {
  const body = await esClient.search<any>({
    index,
    body: {
      query: {
        match_all: {},
      },
      _source: ['type', 'id'],
    },
  });

  return body.hits.hits
    .map((h) => ({
      ...h._source,
      id: h._id,
    }))
    .sort(sortByTypeAndId);
}

describe('migrating from the same Kibana version that used v1 migrations', () => {
  const originalIndex = `.kibana_1`; // v1 migrations index
  const migratedIndex = `.kibana_${kibanaVersion}_001`;

  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: Root;
  let coreStart: InternalCoreStart;
  let esClient: ElasticsearchClient;

  const startServers = async ({ dataArchive, oss }: { dataArchive: string; oss: boolean }) => {
    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          dataArchive,
        },
      },
    });

    root = kbnTestServer.createRootWithCorePlugins(
      {
        migrations: {
          skip: false,
          // There are 40 docs in fixtures. Batch size configured to enforce 3 migration steps.
          batchSize: 15,
        },
        logging: {
          appenders: {
            file: {
              type: 'file',
              fileName: logFilePath,
              layout: {
                type: 'json',
              },
            },
          },
          loggers: [
            {
              name: 'root',
              appenders: ['file'],
              level: 'info',
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
      .preboot()
      .then(() => root.setup())
      .then(() => root.start())
      .then((start) => {
        coreStart = start;
        esClient = coreStart.elasticsearch.client.asInternalUser;
      });
    return await Promise.all([startEsPromise, startKibanaPromise]);
  };

  const getExpectedVersionPerType = () =>
    coreStart.savedObjects
      .getTypeRegistry()
      .getAllTypes()
      .reduce((versionMap, type) => {
        const { name, migrations, convertToMultiNamespaceTypeVersion } = type;
        if (migrations || convertToMultiNamespaceTypeVersion) {
          const migrationsMap = typeof migrations === 'function' ? migrations() : migrations;
          const migrationsKeys = migrationsMap ? Object.keys(migrationsMap) : [];
          if (convertToMultiNamespaceTypeVersion) {
            // Setting this option registers a conversion migration that is reflected in the object's `migrationVersions` field
            migrationsKeys.push(convertToMultiNamespaceTypeVersion);
          }
          const highestVersion = migrationsKeys.sort(Semver.compare).reverse()[0];
          return {
            ...versionMap,
            [name]: highestVersion,
          };
        } else {
          return {
            ...versionMap,
            [name]: undefined,
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

  beforeAll(async () => {
    await removeLogFile();
    await startServers({
      oss: false,
      dataArchive: Path.join(
        __dirname,
        'archives',
        '8.0.0_v1_migrations_sample_data_saved_objects.zip'
      ),
    });
  });

  afterAll(async () => {
    await stopServers();
  });

  it('creates the new index and the correct aliases', async () => {
    const body = await esClient.indices.get(
      {
        index: migratedIndex,
      },
      { ignore: [404] }
    );
    const response = body[migratedIndex];

    expect(response).toBeDefined();
    expect(Object.keys(response.aliases!).sort()).toEqual(['.kibana', `.kibana_${kibanaVersion}`]);
  });

  it('copies the documents from the previous index to the new one', async () => {
    const originalDocs = await fetchDocuments(esClient, originalIndex);
    const migratedDocs = await fetchDocuments(esClient, migratedIndex);
    expect(assertMigratedDocuments(migratedDocs, originalDocs));
  });

  it('migrates the documents to the highest version', async () => {
    const expectedVersions = getExpectedVersionPerType();
    const res = await esClient.search({
      index: migratedIndex,
      body: {
        sort: ['_doc'],
      },
      size: 10000,
    });
    const allDocuments = res.hits.hits as SavedObjectsRawDoc[];
    allDocuments.forEach((doc) => {
      assertMigrationVersion(doc, expectedVersions);
    });
  });
});
