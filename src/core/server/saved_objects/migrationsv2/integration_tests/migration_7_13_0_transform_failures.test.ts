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
import json5 from 'json5';

// const logFilePathOriginal = Path.join(__dirname, 'migration_transform_failures_test_kibana.log');
const logFilePath = Path.join(__dirname, 'my_7_13_corrupt_transform_failures_test.log');

const asyncUnlink = Util.promisify(Fs.unlink);
const asyncReadFile = Util.promisify(Fs.readFile);
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
          dataArchive: Path.join(__dirname, 'archives', 'my_7_13_archive.zip'),
        },
      },
    });

    root = createRoot();

    esServer = await startES();
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
    try {
      await root.start();
    } catch (err) {
      // just make sure the error contains info we expect to get.
      // then read the logs and parse the number of failed transforms from there.

      const messageString = err.message.split('Error')[0].split(' Reason: ')[0];
      expect(messageString).toMatchInlineSnapshot(
        `"Unable to complete saved object migrations for the [.kibana] index: Migrations failed."`
      );
    }
    const logFileContent = await asyncReadFile(logFilePath, 'utf-8');
    const records = logFileContent
      .split('\n')
      .filter(Boolean)
      .map((str) => json5.parse(str));

    // we will get back more than one
    const logRecordsWithTransformFailures = records.find(
      (rec) => rec.message === '[.kibana] REINDEX_SOURCE_TO_TEMP_INDEX RESPONSE'
    );

    expect(logRecordsWithTransformFailures).toBeTruthy();
    expect(logRecordsWithTransformFailures.left.type).toBe('documents_transform_failed');

    const allRecords = records.filter(
      (rec) => rec.message === '[.kibana] REINDEX_SOURCE_TO_TEMP_INDEX RESPONSE'
    );
    expect(allRecords.length).toBeGreaterThan(5);
    const allFailed = allRecords
      .filter((rec) => rec._tag === 'Left')
      .map((failure) => failure.left)
      .reduce(
        function (acc, curr) {
          const corrIds = acc.corruptIds.concat(curr.corruptDocumentIds);
          const transErrs = acc.transformErrs.concat(curr.transformErrors);
          return { corruptIds: corrIds, transformErrs: transErrs };
        },
        { corruptIds: [], transformErrs: [] }
      );
    // console.log('allFailed:', allFailed);
    // returns:
    /**
     * allFailed: {
      corruptIds: [
        'P2SQfHkBs3dBRGh--No5',
        'QGSZfHkBs3dBRGh-ANoD',
        'QWSZfHkBs3dBRGh-hNob',
        'QmSZfHkBs3dBRGh-w9qH',
        'Q2SZfHkBs3dBRGh-9dp2',
        'one',
        'two'
      ],
      transformErrs: [
        { rawId: 'space:default', err: [Object] },
        {
          rawId: 'ingest_manager_settings:af2624d0-b763-11eb-93ce-1931add1dc9a',
          err: [Object]
        }
      ]
    }
     */
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
