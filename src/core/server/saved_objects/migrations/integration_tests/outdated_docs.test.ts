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
import { kibanaPackageJson as pkg } from '@kbn/utils';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import type { ElasticsearchClient } from '../../../elasticsearch';
import { Root } from '../../../root';

const logFilePath = Path.join(__dirname, 'outdated_docs.log');

const asyncUnlink = Util.promisify(Fs.unlink);
async function removeLogFile() {
  // ignore errors if it doesn't exist
  await asyncUnlink(logFilePath).catch(() => void 0);
}

describe('migration v2', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
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

  it.skip('migrates the documents to the highest version', async () => {
    const migratedIndex = `.kibana_${pkg.version}_001`;
    const { startES } = kbnTestServer.createTestServers({
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

    const migratedDocs = await fetchDocs(esClient, migratedIndex);

    expect(migratedDocs.length).toBe(1);
    const [doc] = migratedDocs;
    expect(doc._source.migrationVersion.foo).toBe('7.14.0');
    expect(doc._source.coreMigrationVersion).toBe('8.0.0');
  });
});

function createRoot() {
  return kbnTestServer.createRootWithCorePlugins(
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
