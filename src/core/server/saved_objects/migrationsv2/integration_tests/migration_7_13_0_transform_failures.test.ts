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

const logFilePath = Path.join(__dirname, '7_13_corrupt_transform_failures_test.log');

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
    await expect(root.start()).rejects.toThrowError();

    // parse and verify we collected all the issues before failing the migration.
    const logFileContent = await asyncReadFile(logFilePath, 'utf-8');
    const records = logFileContent
      .split('\n')
      .filter(Boolean)
      .map((str) => json5.parse(str));

    // find one instance and ensure we returned a 'Left' instance of `documents_transform_failed`
    const logRecordsWithTransformFailures = records.find(
      (rec) => rec.message === '[.kibana] REINDEX_SOURCE_TO_TEMP_INDEX RESPONSE'
    );

    expect(logRecordsWithTransformFailures).toBeTruthy();
    expect(logRecordsWithTransformFailures.left.type).toBe('documents_transform_failed');

    // verify we collected corrupt document ids and transformation errors for all batches of migrated docs
    const allRecords = records.filter(
      (rec) => rec.message === '[.kibana] REINDEX_SOURCE_TO_TEMP_INDEX RESPONSE'
    );
    expect(allRecords.length).toBeGreaterThan(5);

    const allFailures = allRecords
      .filter((rec) => rec._tag === 'Left')
      .map((failure) => failure.left)
      .reduce(
        (acc, curr) => {
          return {
            corruptIds: [...acc.corruptIds, ...curr.corruptDocumentIds],
            transformErrs: [...acc.transformErrs, ...curr.transformErrors],
          };
        },
        { corruptIds: [], transformErrs: [] }
      );
    expect(allFailures.corruptIds.length).toBeGreaterThan(5);
    expect(allFailures.transformErrs.length).toBeGreaterThan(0);
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
