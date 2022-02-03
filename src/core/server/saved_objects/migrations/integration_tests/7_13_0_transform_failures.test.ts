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

  afterAll(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  });

  it('migrates the documents to the highest version', async () => {
    const { startES } = kbnTestServer.createTestServers({
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

    root = createRoot();

    esServer = await startES();
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

    try {
      await root.start();
    } catch (err) {
      const errorMessage = err.message;

      expect(
        errorMessage.startsWith(
          'Unable to complete saved object migrations for the [.kibana] index: Migrations failed. Reason: 7 corrupt saved object documents were found: '
        )
      ).toBeTruthy();
      expect(
        errorMessage.endsWith(
          'To allow migrations to proceed, please delete or fix these documents.'
        )
      ).toBeTruthy();

      const expectedCorruptDocIds = [
        'P2SQfHkBs3dBRGh--No5',
        'QGSZfHkBs3dBRGh-ANoD',
        'QWSZfHkBs3dBRGh-hNob',
        'QmSZfHkBs3dBRGh-w9qH',
        'one',
        'two',
        'Q2SZfHkBs3dBRGh-9dp2',
      ];
      for (const corruptDocId of expectedCorruptDocIds) {
        expect(errorMessage.includes(corruptDocId)).toBeTruthy();
      }

      expect(errorMessage.includes('7 transformation errors were encountered:')).toBeTruthy();
      expect(errorMessage).toEqual(
        expect.stringContaining(
          'space:sixth: Error: Migration function for version 7.14.0 threw an error'
        )
      );
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
