/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { Root } from '../../../root';

const logFilePath = Path.join(__dirname, '7_13_unknown_types.log');

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await fs.unlink(logFilePath).catch(() => void 0);
}

describe('migration v2', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: Root;
  let startES: () => Promise<kbnTestServer.TestElasticsearchUtils>;

  beforeAll(async () => {
    await removeLogFile();
  });

  beforeEach(() => {
    ({ startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
          // dataset contains 2 type of unknown docs
          // `foo` documents
          // `space` documents (to mimic a migration with disabled plugins)
          dataArchive: Path.join(__dirname, 'archives', '7.13.0_with_unknown_so.zip'),
        },
      },
    }));
  });

  afterEach(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  });

  it('fails the migration if unknown types are found in the source index', async () => {
    // Start kibana with foo and space types disabled
    root = createRoot();
    esServer = await startES();
    await root.preboot();
    await root.setup();

    try {
      await root.start();
      expect('should have thrown').toEqual('but it did not');
    } catch (err) {
      const errorMessage = err.message;

      expect(
        errorMessage.startsWith(
          'Unable to complete saved object migrations for the [.kibana] index: Migration failed because documents ' +
            'were found for unknown saved object types. To proceed with the migration, please delete these documents from the ' +
            '".kibana_7.13.0_001" index.'
        )
      ).toBeTruthy();

      const unknownDocs = [
        { type: 'space', id: 'space:default' },
        { type: 'space', id: 'space:first' },
        { type: 'space', id: 'space:second' },
        { type: 'space', id: 'space:third' },
        { type: 'space', id: 'space:forth' },
        { type: 'space', id: 'space:fifth' },
        { type: 'space', id: 'space:sixth' },
        { type: 'foo', id: 'P2SQfHkBs3dBRGh--No5' },
        { type: 'foo', id: 'QGSZfHkBs3dBRGh-ANoD' },
        { type: 'foo', id: 'QWSZfHkBs3dBRGh-hNob' },
      ];

      unknownDocs.forEach(({ id, type }) => {
        expect(errorMessage).toEqual(expect.stringContaining(`- "${id}" (type: "${type}")`));
      });

      const client = esServer.es.getClient();
      const { body: response } = await client.indices.getSettings(
        { index: '.kibana_7.13.0_001' },
        { meta: true }
      );
      const settings = response['.kibana_7.13.0_001'].settings as estypes.IndicesIndexSettings;
      expect(settings.index).not.toBeUndefined();
      expect(settings.index!.blocks?.write).not.toEqual('true');
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
