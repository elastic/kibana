/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { deterministicallyRegenerateObjectId } from '@kbn/core-saved-objects-migration-server-internal';

const logFilePath = Path.join(__dirname, 'rewriting_id.log');

const asyncUnlink = Util.promisify(Fs.unlink);
async function removeLogFile() {
  // ignore errors if it doesn't exist
  await asyncUnlink(logFilePath).catch(() => void 0);
}

function sortByTypeAndId(a: { type: string; id: string }, b: { type: string; id: string }) {
  return a.type.localeCompare(b.type) || a.id.localeCompare(b.id);
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
            {
              term: { type: 'bar' },
            },
            {
              term: { type: 'legacy-url-alias' },
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
    .sort(sortByTypeAndId);
}

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

// Failing 9.0 version update: https://github.com/elastic/kibana/issues/192624
describe.skip('migration v2', () => {
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
  });

  it('rewrites id deterministically for SO with namespaceType: "multiple" and "multiple-isolated"', async () => {
    const migratedIndexAlias = `.kibana_${pkg.version}`;
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          // original SO:
          // [
          //   { id: 'foo:1', type: 'foo', foo: { name: 'Foo 1 default' } },
          //   { id: 'spacex:foo:1', type: 'foo', foo: { name: 'Foo 1 spacex' }, namespace: 'spacex' },
          //   {
          //     id: 'bar:1',
          //     type: 'bar',
          //     bar: { nomnom: 1 },
          //     references: [{ type: 'foo', id: '1', name: 'Foo 1 default' }],
          //   },
          //   {
          //     id: 'spacex:bar:1',
          //     type: 'bar',
          //     bar: { nomnom: 2 },
          //     references: [{ type: 'foo', id: '1', name: 'Foo 1 spacex' }],
          //     namespace: 'spacex',
          //   },
          // ];
          dataArchive: Path.join(
            __dirname,
            '..',
            'archives',
            '7.13.2_so_with_multiple_namespaces.zip'
          ),
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
      mappings: { properties: { name: { type: 'text' } } },
      namespaceType: 'multiple',
      convertToMultiNamespaceTypeVersion: '8.0.0',
    });

    coreSetup.savedObjects.registerType({
      name: 'bar',
      hidden: false,
      mappings: { properties: { nomnom: { type: 'integer' } } },
      namespaceType: 'multiple-isolated',
      convertToMultiNamespaceTypeVersion: '8.0.0',
    });

    const coreStart = await root.start();
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    const migratedDocs = await fetchDocs(esClient, migratedIndexAlias);

    // each newly converted multi-namespace object in a non-default space has its ID deterministically regenerated, and a legacy-url-alias
    // object is created which links the old ID to the new ID
    const newFooId = deterministicallyRegenerateObjectId('spacex', 'foo', '1');
    const newBarId = deterministicallyRegenerateObjectId('spacex', 'bar', '1');

    expect(migratedDocs).toEqual(
      [
        {
          id: 'foo:1',
          type: 'foo',
          foo: { name: 'Foo 1 default' },
          references: [],
          namespaces: ['default'],
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: '8.0.0',
          managed: false,
        },
        {
          id: `foo:${newFooId}`,
          type: 'foo',
          foo: { name: 'Foo 1 spacex' },
          references: [],
          namespaces: ['spacex'],
          originId: '1',
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: '8.0.0',
          managed: false,
        },
        {
          // new object for spacex:foo:1
          id: 'legacy-url-alias:spacex:foo:1',
          type: 'legacy-url-alias',
          'legacy-url-alias': {
            sourceId: '1',
            targetId: newFooId,
            targetNamespace: 'spacex',
            targetType: 'foo',
            purpose: 'savedObjectConversion',
          },
          references: [],
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: '8.2.0',
        },
        {
          id: 'bar:1',
          type: 'bar',
          bar: { nomnom: 1 },
          references: [{ type: 'foo', id: '1', name: 'Foo 1 default' }],
          namespaces: ['default'],
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: '8.0.0',
          managed: false,
        },
        {
          id: `bar:${newBarId}`,
          type: 'bar',
          bar: { nomnom: 2 },
          references: [{ type: 'foo', id: newFooId, name: 'Foo 1 spacex' }],
          namespaces: ['spacex'],
          originId: '1',
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: '8.0.0',
          managed: false,
        },
        {
          // new object for spacex:bar:1
          id: 'legacy-url-alias:spacex:bar:1',
          type: 'legacy-url-alias',
          'legacy-url-alias': {
            sourceId: '1',
            targetId: newBarId,
            targetNamespace: 'spacex',
            targetType: 'bar',
            purpose: 'savedObjectConversion',
          },
          references: [],
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: '8.2.0',
        },
      ].sort(sortByTypeAndId)
    );
  });
});
