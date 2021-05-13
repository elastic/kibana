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
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { Root } from '../../../root';

const logFilePath = Path.join(__dirname, 'migration_test_corrupt_docs_kibana.log');

const asyncUnlink = Util.promisify(Fs.unlink);
async function removeLogFile() {
  // ignore errors if it doesn't exist
  await asyncUnlink(logFilePath).catch(() => void 0);
}

describe('migration v2 with corrupt saved object documents', () => {
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

  it('collects corrupt saved object documents accross batches', async () => {
    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          // original uncorrupt SO:
          // {
          //  type: 'foo', // 'bar', 'baz'
          //  foo: {}, // bar: {}, baz: {}
          //  migrationVersion: {
          //    foo: '7.13.0',
          //  },
          // },
          // original corrupt SO example:
          // {
          //  id: 'bar:123'
          //  type: 'foo',
          //  foo: {},
          //  migrationVersion: {
          //    foo: '7.13.0',
          //  },
          // },
          // contains migrated index with 8.0 aliases to skip migration, but run outdated doc search
          dataArchive: Path.join(
            __dirname,
            'archives',
            '8.0.0_migrated_with_corrupt_outdated_docs.zip'
          ),
        },
      },
    });

    root = createRoot();

    esServer = await startES();
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
    coreSetup.savedObjects.registerType({
      name: 'bar',
      hidden: false,
      mappings: { properties: {} },
      namespaceType: 'agnostic',
      migrations: {
        '7.14.0': (doc) => doc,
      },
    });
    coreSetup.savedObjects.registerType({
      name: 'baz',
      hidden: false,
      mappings: { properties: {} },
      namespaceType: 'agnostic',
      migrations: {
        '7.14.0': (doc) => doc,
      },
    });
    try {
      await root.start();
    } catch (err) {
      const corruptFooSOs = /foo:/g;
      const corruptBarSOs = /bar:/g;
      const corruptBazSOs = /baz:/g;
      expect(
        [
          ...err.message.matchAll(corruptFooSOs),
          ...err.message.matchAll(corruptBarSOs),
          ...err.message.matchAll(corruptBazSOs),
        ].length
      ).toEqual(16);
    }
  });
});

function createRoot() {
  return kbnTestServer.createRootWithCorePlugins(
    {
      migrations: {
        skip: false,
        enableV2: true,
        batchSize: 5,
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
          },
        ],
      },
    },
    {
      oss: true,
    }
  );
}
