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

const logFilePath = Path.join(__dirname, 'migration_transform_failures_test_kibana.log');

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
          // example of original 'bar' SO:
          // {
          //  type: 'bar',
          //  bar: {
          // name: 'Mary', // may be missing
          // surname: 'Doe, // may be missing
          // age: 25, // may be missing
          // old: false // may be missing
          // },
          //  migrationVersion: {
          //    bar: '7.13.0',
          //  },
          // },
          // SO that will fail transformation:
          // {
          //  type: 'space',
          //  space: {},
          // },
          //
          //
          dataArchive: Path.join(__dirname, 'archives', '7.13.0_transform_failures_archive.zip'),
        },
      },
    });

    root = createRoot();

    esServer = await startES();
    const coreSetup = await root.setup();

    coreSetup.savedObjects.registerType({
      name: 'bar',
      hidden: false,
      mappings: {
        properties: {
          name: { type: 'text' },
          surname: { type: 'text' },
          age: { type: 'number' },
          old: { type: 'boolean' },
        },
      },
      namespaceType: 'agnostic',
      migrations: {
        '7.13.0': (doc) => doc,
      },
    });

    coreSetup.savedObjects.registerType({
      name: 'foo',
      hidden: false,
      mappings: {
        properties: {},
      },
      namespaceType: 'agnostic',
      migrations: {
        '7.13.0': (doc) => doc,
      },
    });
    try {
      await root.start();
    } catch (err) {
      const messageString = err.message.split('Error')[0];
      expect(messageString).toMatchInlineSnapshot(`
        "Unable to complete saved object migrations for the [.kibana] index: Migrations failed. Reason: Corrupt saved object documents: wkBfbXkBrZykqofUMvhC,w0BfbXkBrZykqofUPfi9,xEBfbXkBrZykqofUUPjI,xUBfbXkBrZykqofUXPit,wUBfbXkBrZykqofUFfji,1,2,3,6,5,4,10,9,8,12,11,7,13,14,15,16 Transformation errors: space:default: Document \\"default\\" has property \\"space\\" which belongs to a more recent version of Kibana [6.6.0]. The last known version is [undefined]
         "
      `);
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
