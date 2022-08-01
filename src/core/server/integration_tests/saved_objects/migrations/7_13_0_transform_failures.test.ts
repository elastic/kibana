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
import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/utils';
import { getEnvOptions } from '@kbn/config-mocks';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { Root } from '../../../root';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { getMigrationDocLink } from './test_utils';

const migrationDocLink = getMigrationDocLink().resolveMigrationFailures;
const logFilePath = Path.join(__dirname, '7_13_corrupt_transform_failures.log');

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

  afterEach(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  describe('when `migrations.discardCorruptObjects` does not match current kibana version', () => {
    it('fails to migrate when corrupt objects and transform errors are encountered', async () => {
      const { startES } = createTestServers();
      root = createRoot();
      esServer = await startES();
      await rootPrebootAndSetup(root);

      try {
        await root.start();
      } catch (err) {
        const errorMessage = err.message;
        const errorLines = errorMessage.split('\n');
        const errorMessageWithoutStack = errorLines
          .filter((line: string) => !line.includes(' at '))
          .join('\n');

        expect(errorMessageWithoutStack).toMatchInlineSnapshot(`
          "Unable to complete saved object migrations for the [.kibana] index: Migrations failed. Reason: 7 corrupt saved object documents were found: P2SQfHkBs3dBRGh--No5, QGSZfHkBs3dBRGh-ANoD, QWSZfHkBs3dBRGh-hNob, QmSZfHkBs3dBRGh-w9qH, one, two, Q2SZfHkBs3dBRGh-9dp2
           7 transformation errors were encountered:
          - space:default: Error: Migration function for version 7.14.0 threw an error
          Caused by:
          TypeError: Cannot set properties of undefined (setting 'bar')
          - space:first: Error: Migration function for version 7.14.0 threw an error
          Caused by:
          TypeError: Cannot set properties of undefined (setting 'bar')
          - space:forth: Error: Migration function for version 7.14.0 threw an error
          Caused by:
          TypeError: Cannot set properties of undefined (setting 'bar')
          - space:second: Error: Migration function for version 7.14.0 threw an error
          Caused by:
          TypeError: Cannot set properties of undefined (setting 'bar')
          - space:fifth: Error: Migration function for version 7.14.0 threw an error
          Caused by:
          TypeError: Cannot set properties of undefined (setting 'bar')
          - space:third: Error: Migration function for version 7.14.0 threw an error
          Caused by:
          TypeError: Cannot set properties of undefined (setting 'bar')
          - space:sixth: Error: Migration function for version 7.14.0 threw an error
          Caused by:
          TypeError: Cannot set properties of undefined (setting 'bar')

          To allow migrations to proceed, please delete or fix these documents.
          Note that you can configure Kibana to automatically discard corrupt documents and transform errors for this migration.
          Please refer to ${migrationDocLink} for more information."
        `);
        return;
      }
      // Fail test if above expression doesn't throw anything.
      expect('to throw').toBe('but did not');
    });
  });

  describe('when `migrations.discardCorruptObjects` matches current kibana version', () => {
    it('proceeds with the migration, ignoring corrupt objects and transform errors', async () => {
      const { startES } = createTestServers();
      const currentVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
      root = createRoot(currentVersion);
      esServer = await startES();
      await rootPrebootAndSetup(root);

      await expect(root.start()).resolves.not.toThrowError();
      // TODO check that the destination indices contain data, but NOT the conflicting objects

      const esClient: ElasticsearchClient = esServer.es.getClient();
      const docs = await esClient.search({
        index: '.kibana',
        _source: false,
        fields: ['_id'],
        size: 50,
      });

      // 23 saved objects + 14 corrupt (discarded) = 37 total in the old index
      expect((docs.hits.total as SearchTotalHits).value).toEqual(23);
      expect(docs.hits.hits.map(({ _id }) => _id)).toEqual([
        'config:7.13.0',
        'index-pattern:logs-*',
        'index-pattern:metrics-*',
        'usage-counters:uiCounter:21052021:click:global_search_bar:user_navigated_to_application',
        'usage-counters:uiCounter:21052021:count:console:GET_cat.aliases',
        'usage-counters:uiCounter:21052021:loaded:console:opened_app',
        'usage-counters:uiCounter:21052021:count:console:GET_cat.indices',
        'usage-counters:uiCounter:21052021:count:global_search_bar:search_focus',
        'usage-counters:uiCounter:21052021:click:global_search_bar:user_navigated_to_application_unknown',
        'usage-counters:uiCounter:21052021:count:global_search_bar:search_request',
        'usage-counters:uiCounter:21052021:count:global_search_bar:shortcut_used',
        'ui-metric:console:POST_delete_by_query',
        'usage-counters:uiCounter:21052021:count:console:PUT_indices.put_mapping',
        'usage-counters:uiCounter:21052021:count:console:POST_delete_by_query',
        'usage-counters:uiCounter:21052021:count:console:GET_search',
        'ui-metric:console:PUT_indices.put_mapping',
        'ui-metric:console:GET_search',
        'usage-counters:uiCounter:21052021:count:console:DELETE_delete',
        'ui-metric:console:DELETE_delete',
        'usage-counters:uiCounter:21052021:count:console:GET_get',
        'ui-metric:console:GET_get',
        'usage-counters:uiCounter:21052021:count:console:POST_index',
        'ui-metric:console:POST_index',
      ]);
    });
  });
});

function createTestServers() {
  return kbnTestServer.createTestServers({
    adjustTimeout: (t: number) => jest.setTimeout(t),
    settings: {
      es: {
        license: 'basic',
        // example of original 'foo' SO with corrupt id:
        // _id: one
        // {
        //  foo: {
        //    name: 'one',
        //  },
        //  type: 'foo',
        //  references: [],
        //  migrationVersion: {
        //    foo: '7.13.0',
        //  },
        // "coreMigrationVersion": "7.13.0",
        // "updated_at": "2021-05-16T18:16:45.450Z"
        // },

        // SO that will fail transformation:
        // {
        //  type: 'space',
        //  space: {},
        // },
        //
        //
        dataArchive: Path.join(
          __dirname,
          'archives',
          '7_13_corrupt_and_transform_failures_docs.zip'
        ),
      },
    },
  });
}

function createRoot(discardCorruptObjects?: string) {
  return kbnTestServer.createRootWithCorePlugins(
    {
      migrations: {
        skip: false,
        batchSize: 5,
        discardCorruptObjects,
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

async function rootPrebootAndSetup(root: Root) {
  await root.preboot();
  const coreSetup = await root.setup();

  coreSetup.savedObjects.registerType({
    name: 'foo',
    hidden: false,
    mappings: {
      properties: {},
    },
    namespaceType: 'agnostic',
    migrations: {
      '7.14.0': (doc) => doc,
    },
  });

  // registering the `space` type with a throwing migration fn to avoid the migration failing for unknown types
  coreSetup.savedObjects.registerType({
    name: 'space',
    hidden: false,
    mappings: {
      properties: {},
    },
    namespaceType: 'single',
    migrations: {
      '7.14.0': (doc) => {
        doc.attributes.foo.bar = 12;
        return doc;
      },
    },
  });
}
