/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { unlink } from 'fs/promises';
import { REPO_ROOT } from '@kbn/utils';
import { Env } from '@kbn/config';
import { getEnvOptions } from '../../../config/mocks';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { ElasticsearchClient } from '../../../elasticsearch';
import { InternalCoreStart } from '../../../internal_types';
import { Root } from '../../../root';

const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
const logFilePath = path.join(__dirname, '7.7.2_xpack_100k.log');

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await unlink(logFilePath).catch(() => void 0);
}

describe('migration from 7.7.2-xpack with 100k objects', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: Root;
  let coreStart: InternalCoreStart;
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    jest.setTimeout(600000);
  });

  const startServers = async ({ dataArchive, oss }: { dataArchive: string; oss: boolean }) => {
    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(600000),
      settings: {
        es: {
          license: 'trial',
          dataArchive,
        },
      },
    });

    root = kbnTestServer.createRootWithCorePlugins(
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
              level: 'info',
              appenders: ['file'],
            },
          ],
        },
      },
      {
        oss,
      }
    );

    const startEsPromise = startES().then((es) => (esServer = es));
    const startKibanaPromise = root
      .preboot()
      .then(() => root.setup())
      .then(() => root.start())
      .then((start) => {
        coreStart = start;
        esClient = coreStart.elasticsearch.client.asInternalUser;
      });

    await Promise.all([startEsPromise, startKibanaPromise]);
  };

  const stopServers = async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  };

  const migratedIndex = `.kibana_${kibanaVersion}_001`;

  beforeAll(async () => {
    await removeLogFile();
    await startServers({
      oss: false,
      dataArchive: path.join(__dirname, 'archives', '7.7.2_xpack_100k_obj.zip'),
    });
  });

  afterAll(async () => {
    await stopServers();
  });

  it('copies all the document of the previous index to the new one', async () => {
    const migratedIndexResponse = await esClient.count({
      index: migratedIndex,
    });
    const oldIndexResponse = await esClient.count({
      index: '.kibana_1',
    });

    // Use a >= comparison since once Kibana has started it might create new
    // documents like telemetry tasks
    expect(migratedIndexResponse.count).toBeGreaterThanOrEqual(oldIndexResponse.count);
  });
});
