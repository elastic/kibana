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

const logFilePath = Path.join(__dirname, 'cleanup_test.log');

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
          license: 'trial',
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
    await root.setup();

    await expect(root.start()).rejects.toThrow(
      /Unable to migrate the corrupt saved object document with _id: 'index-pattern:test_index\*'/
    );

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
