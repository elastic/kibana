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
import json5 from 'json5';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { Root } from '../../../root';

const logFilePath = Path.join(__dirname, 'migration_test_corrupt_docs_kibana.log');

const asyncUnlink = Util.promisify(Fs.unlink);
const asyncReadFile = Util.promisify(Fs.readFile);
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
        '7.14.0': (doc) => {
          throw new Error('nope!');
        },
      },
    });
    coreSetup.savedObjects.registerType({
      name: 'bar',
      hidden: false,
      mappings: { properties: {} },
      namespaceType: 'agnostic',
      migrations: {
        '7.14.0': (doc) => {
          throw new Error('nope!');
        },
      },
    });
    coreSetup.savedObjects.registerType({
      name: 'baz',
      hidden: false,
      mappings: { properties: {} },
      namespaceType: 'agnostic',
      migrations: {
        '7.14.0': (doc) => {
          throw new Error('nope');
        },
      },
    });
    await expect(root.start()).rejects.toThrowError();

    const logFileContent = await asyncReadFile(logFilePath, 'utf-8');
    const records = logFileContent
      .split('\n')
      .filter(Boolean)
      .map((str) => json5.parse(str));

    const logRecordsWithTransformFailures = records.find(
      (rec) => rec.message === '[.kibana] OUTDATED_DOCUMENTS_TRANSFORM RESPONSE'
    );
    expect(logRecordsWithTransformFailures).toBeTruthy();
    expect(logRecordsWithTransformFailures.left.type).toBe('documents_transform_failed');

    const allRecords = records.filter(
      (rec) => rec.message === '[.kibana] OUTDATED_DOCUMENTS_TRANSFORM RESPONSE'
    );
    expect(allRecords.length).toBeGreaterThan(2);

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
