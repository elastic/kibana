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
import JSON5 from 'json5';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import type { Root } from '../../../root';

const logFilePath = Path.join(__dirname, 'cleanup.log');

const asyncUnlink = Util.promisify(Fs.unlink);
const asyncReadFile = Util.promisify(Fs.readFile);

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await asyncUnlink(logFilePath).catch(() => void 0);
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
            appenders: ['file'],
            level: 'debug', // DEBUG logs are required to retrieve the PIT _id from the action response logs
          },
        ],
      },
    },
    {
      oss: true,
    }
  );
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

  it('clean ups if migration fails', async () => {
    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          // original SO:
          // {
          //   _index: '.kibana_7.13.0_001',
          //     _type: '_doc',
          //   _id: 'index-pattern:test_index*',
          //   _version: 1,
          //   result: 'created',
          //   _shards: { total: 2, successful: 1, failed: 0 },
          //   _seq_no: 0,
          //     _primary_term: 1
          // }
          dataArchive: Path.join(__dirname, 'archives', '7.13.0_with_corrupted_so.zip'),
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

    await expect(root.start()).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Unable to complete saved object migrations for the [.kibana] index: Migrations failed. Reason: 1 corrupt saved object documents were found: index-pattern:test_index*
      To allow migrations to proceed, please delete or fix these documents."
    `);

    const logFileContent = await asyncReadFile(logFilePath, 'utf-8');
    const records = logFileContent
      .split('\n')
      .filter(Boolean)
      .map((str) => JSON5.parse(str));

    const logRecordWithPit = records.find(
      (rec) => rec.message === '[.kibana] REINDEX_SOURCE_TO_TEMP_OPEN_PIT RESPONSE'
    );

    expect(logRecordWithPit).toBeTruthy();

    const pitId = logRecordWithPit.right.pitId;
    expect(pitId).toBeTruthy();

    const client = esServer.es.getClient();
    await expect(
      client.search({
        body: {
          pit: { id: pitId },
        },
      })
      // throws an exception that cannot search with closed PIT
    ).rejects.toThrow(/search_phase_execution_exception/);
  });
});
