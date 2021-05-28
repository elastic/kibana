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
import glob from 'glob';
import { kibanaServerTestUser } from '@kbn/test';
import { kibanaPackageJson as pkg } from '@kbn/utils';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import type { ElasticsearchClient } from '../../../elasticsearch';
import { Root } from '../../../root';

const LOG_FILE_PREFIX = 'migration_test_multiple_es_nodes';

const asyncUnlink = Util.promisify(Fs.unlink);

async function removeLogFile() {
  glob(Path.join(__dirname, `${LOG_FILE_PREFIX}_*.log`), (err, files) => {
    files.forEach(async (file) => {
      // ignore errors if it doesn't exist
      await asyncUnlink(file).catch(() => void 0);
    });
  });
}

function extractSortNumberFromId(id: string): number {
  const parsedId = parseInt(id.split(':')[1], 10); // "foo:123" -> 123
  if (isNaN(parsedId)) {
    throw new Error(`Failed to parse Saved Object ID [${id}]. Result is NaN`);
  }
  return parsedId;
}

async function fetchDocs(esClient: ElasticsearchClient, index: string, type: string) {
  const { body } = await esClient.search<any>({
    index,
    size: 10000,
    body: {
      query: {
        bool: {
          should: [
            {
              term: { type },
            },
          ],
        },
      },
    },
  });

  return body.hits.hits
    .map((h) => ({
      ...h._source,
      id: h._id,
    }))
    .sort((a, b) => extractSortNumberFromId(a.id) - extractSortNumberFromId(b.id));
}

interface RootConfig {
  logFileName: string;
}

function createRoot({ logFileName }: RootConfig) {
  return kbnTestServer.createRoot(
    {
      elasticsearch: {
        // TODO: Use esTestConfig.getUrl() once we figure out support for multiple URLs
        hosts: ['http://elastic:changeme@localhost:9220', 'http://elastic:changeme@localhost:9221'],
        username: kibanaServerTestUser.username,
        password: kibanaServerTestUser.password,
      },
      migrations: {
        skip: false,
        enableV2: true,
        batchSize: 100, // fixture contains 5000 docs
      },
      logging: {
        appenders: {
          file: {
            type: 'file',
            fileName: logFileName,
            layout: {
              type: 'json',
            },
          },
        },
        loggers: [
          {
            name: 'root',
            appenders: ['file'],
          },
        ],
      },
    },
    {
      oss: true,
    }
  );
}

describe('migration v2', () => {
  let esServer1: kbnTestServer.TestElasticsearchUtils;
  let esServer2: kbnTestServer.TestElasticsearchUtils;
  let root: Root;
  const migratedIndex = `.kibana_${pkg.version}_001`;

  beforeAll(async () => {
    await removeLogFile();
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10000));
  });

  afterEach(async () => {
    await root.shutdown();

    if (esServer1) {
      await esServer1.stop();
    }

    if (esServer2) {
      await esServer2.stop();
    }
  });

  it('migrates saved objects normally with multiple ES nodes', async () => {
    root = createRoot({
      logFileName: Path.join(__dirname, `${LOG_FILE_PREFIX}.log`),
    });

    const { startES: startES1 } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          // license: 'trial',
          license: 'basic',
          // original SO (2500 of type `foo` + 2500 of type `bar`):
          // [
          //   { id: 'foo:1', type: 'foo', foo: { status: 'not_migrated_1' } },
          //   { id: 'bar:1', type: 'bar', bar: { status: 'not_migrated_1' } },
          //   { id: 'foo:2', type: 'foo', foo: { status: 'not_migrated_2' } },
          //   { id: 'bar:2', type: 'bar', bar: { status: 'not_migrated_2' } },
          // ];
          dataArchive: Path.join(__dirname, 'archives', '7.13.0_5k_so_node_01.zip'),
          installDirName: 'es-test-cluster-01',
          port: '9220',
          clusterName: 'es-test-cluster',
          esArgs: [
            'node.name=es_01',
            'discovery.type=zen',
            'cluster.initial_master_nodes=es_01,es_02',
            'xpack.security.enabled=false',
          ],
        },
      },
    });

    const { startES: startES2 } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          // original SO (2500 of type `foo` + 2500 of type `bar`):
          // [
          //   { id: 'foo:1', type: 'foo', foo: { status: 'not_migrated_1' } },
          //   { id: 'bar:1', type: 'bar', bar: { status: 'not_migrated_1' } },
          //   { id: 'foo:2', type: 'foo', foo: { status: 'not_migrated_2' } },
          //   { id: 'bar:2', type: 'bar', bar: { status: 'not_migrated_2' } },
          // ];
          dataArchive: Path.join(__dirname, 'archives', '7.13.0_5k_so_node_02.zip'),
          installDirName: 'es-test-cluster-02',
          port: '9221',
          clusterName: 'es-test-cluster',
          esArgs: [
            'node.name=es_02',
            'discovery.type=zen',
            'cluster.initial_master_nodes=es_01,es_02',
            'xpack.security.enabled=false',
          ],
        },
      },
    });

    [esServer1, esServer2] = await Promise.all([startES1(), startES2()]);

    const setup = await root.setup();
    setup.savedObjects.registerType({
      name: 'foo',
      hidden: false,
      mappings: { properties: { status: { type: 'text' } } },
      namespaceType: 'agnostic',
      migrations: {
        '7.14.0': (doc) => {
          if (doc.attributes?.status) {
            doc.attributes.status = doc.attributes.status.replace('not_migrated', 'migrated');
          }
          return doc;
        },
      },
    });
    setup.savedObjects.registerType({
      name: 'bar',
      hidden: false,
      mappings: { properties: { status: { type: 'text' } } },
      namespaceType: 'agnostic',
      migrations: {
        '7.14.0': (doc) => {
          if (doc.attributes?.status) {
            doc.attributes.status = doc.attributes.status.replace('not_migrated', 'migrated');
          }
          return doc;
        },
      },
    });

    const start = await root.start();
    const esClient = start.elasticsearch.client.asInternalUser;

    const migratedFooDocs = await fetchDocs(esClient, migratedIndex, 'foo');
    expect(migratedFooDocs.length).toBe(2500);
    migratedFooDocs.forEach((doc, i) => {
      expect(doc.id).toBe(`foo:${i}`);
      expect(doc.foo.status).toBe(`migrated_${i}`);
      expect(doc.migrationVersion.foo).toBe('7.14.0');
    });

    const migratedBarDocs = await fetchDocs(esClient, migratedIndex, 'bar');
    expect(migratedBarDocs.length).toBe(2500);
    migratedBarDocs.forEach((doc, i) => {
      expect(doc.id).toBe(`bar:${i}`);
      expect(doc.foo.status).toBe(`migrated_${i}`);
      expect(doc.migrationVersion.foo).toBe('7.14.0');
    });
  });
});
