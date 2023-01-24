/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/repo-info';
import { getEnvOptions } from '@kbn/config-mocks';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Root } from '@kbn/core-root-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';

const logFilePath = Path.join(__dirname, '7_13_unknown_types.log');

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await fs.unlink(logFilePath).catch(() => void 0);
}

describe('migration v2', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;
  let startES: () => Promise<TestElasticsearchUtils>;

  beforeAll(async () => {
    await removeLogFile();
  });

  beforeEach(() => {
    ({ startES } = createTestServers({
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

  describe('when `discardUnknownObjects` does not match current kibana version', () => {
    it('fails the migration if unknown types are found in the source index', async () => {
      // Start kibana with foo and space types disabled
      root = createRoot('7.13.0');
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
            'Unable to complete saved object migrations for the [.kibana] index: Migration failed because some documents ' +
              'were found which use unknown saved object types:'
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
        const settings = response['.kibana_7.13.0_001'].settings as IndicesIndexSettings;
        expect(settings.index).not.toBeUndefined();
        expect(settings.index!.blocks?.write).not.toEqual('true');
      }
    });
  });

  describe('when `discardUnknownObjects` matches current kibana version', () => {
    const currentVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;

    it('discards the documents with unknown types and finishes the migration successfully', async () => {
      // Start kibana with foo and space types disabled
      root = createRoot(currentVersion);
      esServer = await startES();
      await root.preboot();
      await root.setup();

      // the migration process should finish successfully
      await expect(root.start()).resolves.not.toThrowError();

      const esClient: ElasticsearchClient = esServer.es.getClient();
      const body = await esClient.count({ q: 'type:foo|space' });
      expect(body.count).toEqual(0);
    });
  });
});

function createRoot(discardUnknownObjects?: string) {
  return createRootWithCorePlugins(
    {
      migrations: {
        skip: false,
        batchSize: 5,
        discardUnknownObjects,
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
