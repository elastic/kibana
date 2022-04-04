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
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { Root } from '../../../root';
import { ElasticsearchClient } from '../../../elasticsearch';
import { LogRecord } from '@kbn/logging';
import { retryAsync } from '../test_helpers/retry_async';

const logFilePath = Path.join(__dirname, 'unsupported_cluster_routing_allocation.log');

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await fs.unlink(logFilePath).catch(() => void 0);
}

const { startES } = kbnTestServer.createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
  settings: {
    es: {
      license: 'basic',
      dataArchive: Path.join(__dirname, 'archives', '7.7.2_xpack_100k_obj.zip'),
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
  value: string = 'none'
) {
  return await esClient.cluster.putSettings({
    [settingType]: { cluster: { routing: { allocation: { enable: value } } } },
  });
}

describe('unsupported_cluster_routing_allocation', () => {
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

  it('fails with a descriptive message when persistent replica allocation is not enabled', async () => {
    const initialSettings = await client.cluster.getSettings({ flat_settings: true });

    expect(getClusterRoutingAllocations(initialSettings)).toBe(true);

    await updateRoutingAllocations(client, 'persistent', 'none');

    const updatedSettings = await client.cluster.getSettings({ flat_settings: true });

    expect(getClusterRoutingAllocations(updatedSettings)).toBe(false);

    // now try to start Kibana
    root = createKbnRoot();
    await root.preboot();
    await root.setup();

    await expect(root.start()).rejects.toThrowError(
      /Unable to complete saved object migrations for the \[\.kibana.*\] index: The elasticsearch cluster has cluster routing allocation incorrectly set for migrations to continue\. To proceed, please remove the cluster routing allocation settings with PUT \/_cluster\/settings {"transient": {"cluster\.routing\.allocation\.enable": null}, "persistent": {"cluster\.routing\.allocation\.enable": null}}/
    );

    await retryAsync(
      async () => {
        const logFileContent = await fs.readFile(logFilePath, 'utf-8');
        const records = logFileContent
          .split('\n')
          .filter(Boolean)
          .map((str) => JSON5.parse(str)) as LogRecord[];
        expect(
          records.find((rec) =>
            /^Unable to complete saved object migrations for the \[\.kibana.*\] index: The elasticsearch cluster has cluster routing allocation incorrectly set for migrations to continue\./.test(
              rec.message
            )
          )
        ).toBeDefined();
      },
      { retryAttempts: 10, retryDelayMs: 200 }
    );
  });

  it('fails with a descriptive message when persistent replica allocation is set to "primaries"', async () => {
    await updateRoutingAllocations(client, 'persistent', 'primaries');

    const updatedSettings = await client.cluster.getSettings({ flat_settings: true });

    expect(getClusterRoutingAllocations(updatedSettings)).toBe(false);

    // now try to start Kibana
    root = createKbnRoot();
    await root.preboot();
    await root.setup();

    await expect(root.start()).rejects.toThrowError(
      /Unable to complete saved object migrations for the \[\.kibana.*\] index: The elasticsearch cluster has cluster routing allocation incorrectly set for migrations to continue\. To proceed, please remove the cluster routing allocation settings with PUT \/_cluster\/settings {"transient": {"cluster\.routing\.allocation\.enable": null}, "persistent": {"cluster\.routing\.allocation\.enable": null}}/
    );
  });
});
