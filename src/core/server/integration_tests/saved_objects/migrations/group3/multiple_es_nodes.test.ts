/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import del from 'del';
import { kibanaServerTestUser } from '@kbn/test';
import { kibanaPackageJson as pkg } from '@kbn/repo-info';
import {
  createTestServers,
  createRoot as createkbnTestServerRoot,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Root } from '@kbn/core-root-server-internal';
import { getFips } from 'crypto';

const LOG_FILE_PREFIX = 'migration_test_multiple_es_nodes';

async function removeLogFile() {
  await del([Path.join(__dirname, `${LOG_FILE_PREFIX}_*.log`)], { force: true });
}

function extractSortNumberFromId(id: string): number {
  const parsedId = parseInt(id.split(':')[1], 10); // "foo:123" -> 123
  if (isNaN(parsedId)) {
    throw new Error(`Failed to parse Saved Object ID [${id}]. Result is NaN`);
  }
  return parsedId;
}

async function fetchDocs(esClient: ElasticsearchClient, index: string, type: string) {
  const body = await esClient.search<any>({
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
  hosts: string[];
}

function createRoot({ logFileName, hosts }: RootConfig) {
  return createkbnTestServerRoot({
    elasticsearch: {
      hosts,
      username: kibanaServerTestUser.username,
      password: kibanaServerTestUser.password,
    },
    migrations: {
      skip: false,
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
          level: 'info',
        },
      ],
    },
  });
}

describe('migration v2', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;
  const migratedIndexAlias = `.kibana_${pkg.version}`;

  beforeAll(async () => {
    await removeLogFile();
  });

  afterEach(async () => {
    if (root) {
      await root.shutdown();
    }

    if (esServer) {
      await esServer.stop();
    }
  });

  if (getFips() === 0) {
    it('migrates saved objects normally with multiple ES nodes', async () => {
      const { startES } = createTestServers({
        adjustTimeout: (t: number) => jest.setTimeout(t),
        settings: {
          es: {
            license: 'basic',
            clusterName: 'es-test-cluster',
            nodes: [
              {
                name: 'node-01',
                // original SO (5000 total; 2500 of type `foo` + 2500 of type `bar`):
                // [
                //   { id: 'foo:1', type: 'foo', foo: { status: 'not_migrated_1' } },
                //   { id: 'bar:1', type: 'bar', bar: { status: 'not_migrated_1' } },
                //   { id: 'foo:2', type: 'foo', foo: { status: 'not_migrated_2' } },
                //   { id: 'bar:2', type: 'bar', bar: { status: 'not_migrated_2' } },
                // ];
                dataArchive: Path.join(__dirname, '..', 'archives', '7.13.0_5k_so_node_01.zip'),
              },
              {
                name: 'node-02',
                dataArchive: Path.join(__dirname, '..', 'archives', '7.13.0_5k_so_node_02.zip'),
              },
            ],
          },
        },
      });

      esServer = await startES();

      root = createRoot({
        logFileName: Path.join(__dirname, `${LOG_FILE_PREFIX}.log`),
        hosts: esServer.hosts,
      });

      await root.preboot();
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

      await root.start();
      const esClient = esServer.es.getClient();

      const migratedFooDocs = await fetchDocs(esClient, migratedIndexAlias, 'foo');
      expect(migratedFooDocs.length).toBe(2500);
      migratedFooDocs.forEach((doc, i) => {
        expect(doc.id).toBe(`foo:${i}`);
        expect(doc.foo.status).toBe(`migrated_${i}`);
        expect(doc.typeMigrationVersion).toBe('7.14.0');
      });

      const migratedBarDocs = await fetchDocs(esClient, migratedIndexAlias, 'bar');
      expect(migratedBarDocs.length).toBe(2500);
      migratedBarDocs.forEach((doc, i) => {
        expect(doc.id).toBe(`bar:${i}`);
        expect(doc.bar.status).toBe(`migrated_${i}`);
        expect(doc.typeMigrationVersion).toBe('7.14.0');
      });
    });
  } else {
    it('skips the test when running in FIPS mode since the data archives cause the es nodes to run with a basic license', () => {
      expect(getFips()).toBe(1);
    });
  }
});
