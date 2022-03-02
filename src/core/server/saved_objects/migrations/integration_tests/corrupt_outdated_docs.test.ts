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

const logFilePath = Path.join(__dirname, 'corrupt_outdated_docs.log');

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

  it.skip('collects corrupt saved object documents across batches', async () => {
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
          //  id: 'bar:123' // '123' etc
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
      const errorMessage = err.message;
      expect(
        errorMessage.startsWith(
          'Unable to complete saved object migrations for the [.kibana] index: Migrations failed. Reason: 19 corrupt saved object documents were found: '
        )
      ).toBeTruthy();
      expect(
        errorMessage.endsWith(
          'To allow migrations to proceed, please delete or fix these documents.'
        )
      ).toBeTruthy();
      const expectedCorruptDocIds = [
        '"foo:my_name"',
        '"123"',
        '"456"',
        '"789"',
        '"foo:other_name"',
        '"bar:123"',
        '"baz:123"',
        '"bar:345"',
        '"bar:890"',
        '"baz:456"',
        '"baz:789"',
        '"bar:other_name"',
        '"baz:other_name"',
        '"bar:my_name"',
        '"baz:my_name"',
        '"foo:123"',
        '"foo:456"',
        '"foo:789"',
        '"foo:other"',
      ];
      for (const corruptDocId of expectedCorruptDocIds) {
        expect(errorMessage.includes(corruptDocId)).toBeTruthy();
      }
    }
  });
});

function createRoot() {
  return kbnTestServer.createRootWithCorePlugins(
    {
      migrations: {
        skip: false,
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
            level: 'info',
          },
        ],
      },
    },
    {
      oss: true,
    }
  );
}
