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
import { kibanaPackageJson as pkg } from '@kbn/repo-info';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Root } from '@kbn/core-root-server-internal';

const logFilePath = Path.join(__dirname, 'outdated_docs.log');

const asyncUnlink = Util.promisify(Fs.unlink);
async function removeLogFile() {
  // ignore errors if it doesn't exist
  await asyncUnlink(logFilePath).catch(() => void 0);
}

describe('migration v2', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;

  beforeAll(async () => {
    await removeLogFile();
  });

  afterAll(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  });

  // eslint-disable-next-line jest/no-focused-tests
  fit('migrates the documents to the highest version', async () => {
    const migratedIndexAlias = `.kibana_${pkg.version}`;
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          // original SO:
          // {
          //  type: 'foo',
          //  foo: {},
          //  migrationVersion: {
          //    foo: '7.13.0',
          //  },
          // },
          // contains migrated index with 8.0 aliases to skip migration, but run outdated doc search
          dataArchive: Path.join(__dirname, 'archives', '8.0.0_migrated_with_outdated_docs.zip'),
        },
      },
    });

    root = createRoot();

    esServer = await startES();
    await root.preboot();
    const coreSetup = await root.setup();

    coreSetup.savedObjects.registerType({
      name: 'foo',
      hidden: false,
      mappings: { properties: {} },
      namespaceType: 'agnostic',
      migrations: {
        '7.14.0': (doc) => doc,
      },
    });

    const coreStart = await root.start();
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    const migratedDocs = await fetchDocs(esClient, migratedIndexAlias);

    expect(migratedDocs.length).toBe(1);
    const [doc] = migratedDocs;
    expect(doc._source.migrationVersion.foo).toBe('7.14.0');
    expect(doc._source.coreMigrationVersion).toBe(pkg.version);
  });
});

function createRoot() {
  return createRootWithCorePlugins(
    {
      migrations: {
        skip: false,
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
            level: 'info',
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

async function fetchDocs(esClient: ElasticsearchClient, index: string) {
  const body = await esClient.search<any>({
    index,
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

  return body.hits.hits;
}
