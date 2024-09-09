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
import { esTestConfig, kibanaServerTestUser } from '@kbn/test';
import { kibanaPackageJson as pkg } from '@kbn/repo-info';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  createTestServers,
  createRoot as createkbnTestServerRoot,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Root } from '@kbn/core-root-server-internal';

const LOG_FILE_PREFIX = 'migration_test_multiple_kibana_nodes';

async function removeLogFiles() {
  await del([Path.join(__dirname, `${LOG_FILE_PREFIX}_*.log`)], { force: true });
}

function extractSortNumberFromId(id: string): number {
  const parsedId = parseInt(id.split(':')[1], 10); // "foo:123" -> 123
  if (isNaN(parsedId)) {
    throw new Error(`Failed to parse Saved Object ID [${id}]. Result is NaN`);
  }
  return parsedId;
}

async function fetchDocs(esClient: ElasticsearchClient, index: string) {
  const body = await esClient.search<any>({
    index,
    size: 10000,
    body: {
      query: {
        bool: {
          should: [
            {
              term: { type: 'foo' },
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

interface CreateRootConfig {
  logFileName: string;
}

async function createRoot({ logFileName }: CreateRootConfig) {
  const root = createkbnTestServerRoot({
    elasticsearch: {
      hosts: [esTestConfig.getUrl()],
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
            type: 'pattern',
          },
        },
      },
      loggers: [
        {
          name: 'root',
          appenders: ['file'],
          level: 'info',
        },
        {
          name: 'savedobjects-service',
          appenders: ['file'],
          level: 'debug',
        },
      ],
    },
  });

  await root.preboot();

  return root;
}

// suite is very long, the 10mins default can cause timeouts
jest.setTimeout(15 * 60 * 1000);

// FLAKY: https://github.com/elastic/kibana/issues/156117
describe.skip('migration v2', () => {
  let esServer: TestElasticsearchUtils;
  let rootA: Root;
  let rootB: Root;
  let rootC: Root;

  const migratedIndexAlias = `.kibana_${pkg.version}`;
  const fooType: SavedObjectsType = {
    name: 'foo',
    hidden: false,
    mappings: { properties: { status: { type: 'text' } } },
    namespaceType: 'agnostic',
    migrations: {
      '7.14.0': (doc) => {
        if (doc.attributes?.status) {
          doc.attributes.status = doc.attributes.status.replace('unmigrated', 'migrated');
        }
        return doc;
      },
    },
  };

  const delay = (timeInMs: number) => new Promise((resolve) => setTimeout(resolve, timeInMs));

  beforeEach(async () => {
    await removeLogFiles();

    rootA = await createRoot({
      logFileName: Path.join(__dirname, `${LOG_FILE_PREFIX}_A.log`),
    });
    rootB = await createRoot({
      logFileName: Path.join(__dirname, `${LOG_FILE_PREFIX}_B.log`),
    });
    rootC = await createRoot({
      logFileName: Path.join(__dirname, `${LOG_FILE_PREFIX}_C.log`),
    });

    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          // original SOs: 5k of `foo` docs with this structure:
          // [
          //   { id: 'foo:1', type: 'foo', foo: { status: 'unmigrated' }, migrationVersion: { foo: '7.13.0' } },
          //   { id: 'foo:2', type: 'foo', foo: { status: 'unmigrated' }, migrationVersion: { foo: '7.13.0' } },
          //   { id: 'foo:3', type: 'foo', foo: { status: 'unmigrated' }, migrationVersion: { foo: '7.13.0' } },
          // ];
          dataArchive: Path.join(__dirname, '..', 'archives', '7.13.0_concurrent_5k_foo.zip'),
        },
      },
    });
    esServer = await startES();
  });

  afterEach(async () => {
    try {
      await Promise.all([rootA.shutdown(), rootB.shutdown(), rootC.shutdown()]);
    } catch (e) {
      /* trap */
    }

    if (esServer) {
      await esServer.stop();
    }
  });

  const startWithDelay = async (instances: Root[], delayInSec: number) => {
    const promises: Array<Promise<unknown>> = [];
    const errors: string[] = [];
    for (let i = 0; i < instances.length; i++) {
      promises.push(
        instances[i].start().catch((err) => {
          errors.push(err.message);
        })
      );
      if (i < instances.length - 2) {
        // We wait between instances, but not after the last one
        await delay(delayInSec * 1000);
      }
    }
    await Promise.all(promises);
    if (errors.length) {
      throw new Error(`Failed to start all instances: ${errors.join(',')}`);
    }
  };

  it('migrates saved objects normally when multiple Kibana instances are started at the same time', async () => {
    const setupContracts = await Promise.all([rootA.setup(), rootB.setup(), rootC.setup()]);

    setupContracts.forEach((setup) => setup.savedObjects.registerType(fooType));

    await startWithDelay([rootA, rootB, rootC], 0);

    const esClient = esServer.es.getClient();
    const migratedDocs = await fetchDocs(esClient, migratedIndexAlias);

    expect(migratedDocs.length).toBe(5000);

    migratedDocs.forEach((doc, i) => {
      expect(doc.id).toBe(`foo:${i}`);
      expect(doc.foo.status).toBe(`migrated`);
      expect(doc.typeMigrationVersion).toBe('7.14.0');
    });
  });

  it('migrates saved objects normally when multiple Kibana instances are started with a small interval', async () => {
    const setupContracts = await Promise.all([rootA.setup(), rootB.setup(), rootC.setup()]);

    setupContracts.forEach((setup) => setup.savedObjects.registerType(fooType));

    await startWithDelay([rootA, rootB, rootC], 1);

    const esClient = esServer.es.getClient();
    const migratedDocs = await fetchDocs(esClient, migratedIndexAlias);

    expect(migratedDocs.length).toBe(5000);

    migratedDocs.forEach((doc, i) => {
      expect(doc.id).toBe(`foo:${i}`);
      expect(doc.foo.status).toBe(`migrated`);
      expect(doc.typeMigrationVersion).toBe('7.14.0');
    });
  });

  it('migrates saved objects normally when multiple Kibana instances are started with an average interval', async () => {
    const setupContracts = await Promise.all([rootA.setup(), rootB.setup(), rootC.setup()]);

    setupContracts.forEach((setup) => setup.savedObjects.registerType(fooType));

    await startWithDelay([rootA, rootB, rootC], 5);

    const esClient = esServer.es.getClient();
    const migratedDocs = await fetchDocs(esClient, migratedIndexAlias);

    expect(migratedDocs.length).toBe(5000);

    migratedDocs.forEach((doc, i) => {
      expect(doc.id).toBe(`foo:${i}`);
      expect(doc.foo.status).toBe(`migrated`);
      expect(doc.typeMigrationVersion).toBe('7.14.0');
    });
  });

  it('migrates saved objects normally when multiple Kibana instances are started with a bigger interval', async () => {
    const setupContracts = await Promise.all([rootA.setup(), rootB.setup(), rootC.setup()]);

    setupContracts.forEach((setup) => setup.savedObjects.registerType(fooType));

    await startWithDelay([rootA, rootB, rootC], 20);

    const esClient = esServer.es.getClient();
    const migratedDocs = await fetchDocs(esClient, migratedIndexAlias);

    expect(migratedDocs.length).toBe(5000);

    migratedDocs.forEach((doc, i) => {
      expect(doc.id).toBe(`foo:${i}`);
      expect(doc.foo.status).toBe(`migrated`);
      expect(doc.typeMigrationVersion).toBe('7.14.0');
    });
  });
});
