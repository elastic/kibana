/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { join } from 'path';
import { REPO_ROOT } from '@kbn/dev-utils';
import { Env } from '@kbn/config';
import { getEnvOptions } from '@kbn/config/target/mocks';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { ElasticsearchClient } from '../../../elasticsearch';
import { InternalCoreStart } from '../../../internal_types';
import { Root } from '../../../root';

const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;

describe.skip('migration from 7.7.2-xpack with 100k objects', () => {
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
          license: oss ? 'oss' : 'trial',
          dataArchive,
        },
      },
    });

    root = kbnTestServer.createRootWithCorePlugins(
      {
        migrations: {
          skip: false,
          enableV2: true,
        },
        logging: {
          appenders: {
            file: {
              kind: 'file',
              path: join(__dirname, 'migration_test_kibana.log'),
              layout: {
                kind: 'json',
              },
            },
          },
          loggers: [
            {
              context: 'root',
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
      .setup()
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
    await startServers({
      oss: false,
      dataArchive: join(__dirname, 'archives', '7.7.2_xpack_100k_obj.zip'),
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
    expect(migratedIndexResponse.body.count).toBeGreaterThanOrEqual(oldIndexResponse.body.count);
  });
});
