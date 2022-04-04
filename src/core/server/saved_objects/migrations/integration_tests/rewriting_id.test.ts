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
import { deterministicallyRegenerateObjectId } from '../../migrations/core/document_migrator';

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

// FAILING: https://github.com/elastic/kibana/issues/98351
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

  it('rewrites id deterministically for SO with namespaceType: "multiple" and "multiple-isolated"', async () => {
    const migratedIndex = `.kibana_${pkg.version}_001`;
    const { startES } = kbnTestServer.createTestServers({
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
          dataArchive: Path.join(__dirname, 'archives', '7.13.2_so_with_multiple_namespaces.zip'),
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

    const migratedDocs = await fetchDocs(esClient, migratedIndex);

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
          migrationVersion: { foo: '8.0.0' },
          coreMigrationVersion: pkg.version,
        },
        {
          id: `foo:${newFooId}`,
          type: 'foo',
          foo: { name: 'Foo 1 spacex' },
          references: [],
          namespaces: ['spacex'],
          originId: '1',
          migrationVersion: { foo: '8.0.0' },
          coreMigrationVersion: pkg.version,
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
          migrationVersion: { 'legacy-url-alias': '8.2.0' },
          references: [],
          coreMigrationVersion: pkg.version,
        },
        {
          id: 'bar:1',
          type: 'bar',
          bar: { nomnom: 1 },
          references: [{ type: 'foo', id: '1', name: 'Foo 1 default' }],
          namespaces: ['default'],
          migrationVersion: { bar: '8.0.0' },
          coreMigrationVersion: pkg.version,
        },
        {
          id: `bar:${newBarId}`,
          type: 'bar',
          bar: { nomnom: 2 },
          references: [{ type: 'foo', id: newFooId, name: 'Foo 1 spacex' }],
          namespaces: ['spacex'],
          originId: '1',
          migrationVersion: { bar: '8.0.0' },
          coreMigrationVersion: pkg.version,
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
          migrationVersion: { 'legacy-url-alias': '8.2.0' },
          references: [],
          coreMigrationVersion: pkg.version,
        },
      ].sort(sortByTypeAndId)
    );
  });
});
