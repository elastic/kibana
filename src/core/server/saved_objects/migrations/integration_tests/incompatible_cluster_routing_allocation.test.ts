/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import JSON5 from 'json5';
import { REPO_ROOT } from '@kbn/utils';
import { Env } from '@kbn/config';
import { getDocLinksMeta } from '@kbn/doc-links';
import { getEnvOptions } from '@kbn/config-mocks';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { Root } from '../../../root';
import { ElasticsearchClient } from '../../../elasticsearch';
import { LogRecord } from '@kbn/logging';
import { retryAsync } from '../test_helpers/retry_async';

const logFilePath = Path.join(__dirname, 'incompatible_cluster_routing_allocation.log');
const env = Env.createDefault(REPO_ROOT, getEnvOptions());
const docVersion = getDocLinksMeta({ kibanaBranch: env.packageInfo.branch }).version;

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await fs.unlink(logFilePath).catch(() => void 0);
}

const { startES } = kbnTestServer.createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
  settings: {
    es: {
      license: 'basic',
      dataArchive: Path.join(
        __dirname,
        'archives',
        '8.0.0_v1_migrations_sample_data_saved_objects.zip'
      ),
    },
  },
});

function createKbnRoot() {
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
            level: 'info',
            appenders: ['file'],
          },
        ],
      },
    },
    {
      oss: false,
    }
  );
}

const getClusterRoutingAllocations = (settings: Record<string, any>) => {
  const routingAllocations =
    settings?.transient?.['cluster.routing.allocation.enable'] ??
    settings?.persistent?.['cluster.routing.allocation.enable'] ??
    [];
  return (
    [...routingAllocations].length === 0 ||
    [...routingAllocations].every((s: string) => s === 'all')
  ); // if set, only allow 'all';
};
let esServer: kbnTestServer.TestElasticsearchUtils;

async function updateRoutingAllocations(
  esClient: ElasticsearchClient,
  settingType: string = 'persistent',
  value: string | null
) {
  return await esClient.cluster.putSettings({
    [settingType]: { cluster: { routing: { allocation: { enable: value } } } },
  });
}

describe('incompatible_cluster_routing_allocation', () => {
  let client: ElasticsearchClient;
  let root: Root;

  beforeAll(async () => {
    await removeLogFile();
    esServer = await startES();
    client = esServer.es.getClient();
  });
  afterAll(async () => {
    await esServer.stop();
  });

  it('retries the INIT action with a descriptive message when cluster settings are incompatible', async () => {
    const initialSettings = await client.cluster.getSettings({ flat_settings: true });

    expect(getClusterRoutingAllocations(initialSettings)).toBe(true);

    await updateRoutingAllocations(client, 'persistent', 'none');

    const updatedSettings = await client.cluster.getSettings({ flat_settings: true });

    expect(getClusterRoutingAllocations(updatedSettings)).toBe(false);

    // Start Kibana
    root = createKbnRoot();
    await root.preboot();
    await root.setup();

    root.start();

    // Wait for the INIT -> INIT action retry
    await retryAsync(
      async () => {
        const logFileContent = await fs.readFile(logFilePath, 'utf-8');
        const records = logFileContent
          .split('\n')
          .filter(Boolean)
          .map((str) => JSON5.parse(str)) as LogRecord[];

        // Wait for logs of the second failed attempt to be sure we're correctly incrementing retries
        expect(
          records.find((rec) =>
            rec.message.includes(
              `Action failed with '[incompatible_cluster_routing_allocation] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to https://www.elastic.co/guide/en/kibana/${docVersion}/resolve-migrations-failures.html#routing-allocation-disabled for more information on how to resolve the issue.'. Retrying attempt 2 in 4 seconds.`
            )
          )
        ).toBeDefined();
      },
      { retryAttempts: 20, retryDelayMs: 500 }
    );

    // Reset the cluster routing allocation settings
    await updateRoutingAllocations(client, 'persistent', null);

    // Wait for migrations to succeed
    await retryAsync(
      async () => {
        const logFileContent = await fs.readFile(logFilePath, 'utf-8');
        const records = logFileContent
          .split('\n')
          .filter(Boolean)
          .map((str) => JSON5.parse(str)) as LogRecord[];

        expect(
          records.find((rec) => rec.message.includes('MARK_VERSION_INDEX_READY -> DONE'))
        ).toBeDefined();
      },
      { retryAttempts: 100, retryDelayMs: 500 }
    );

    await root.shutdown();
  });
});
