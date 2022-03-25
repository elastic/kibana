/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { Root } from '../../../root';
import { ElasticsearchClient } from '../../../elasticsearch';

const logFilePath = Path.join(__dirname, '7_13_failed_action_tasks.log');

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await fs.unlink(logFilePath).catch(() => void 0);
}

describe('migration from 7.13 to 7.14+ with many failed action_tasks', () => {
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
          dataArchive: Path.join(__dirname, 'archives', '7.13_1.5k_failed_action_tasks.zip'),
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

  const getCounts = async (
    kibanaIndexName = '.kibana',
    taskManagerIndexName = '.kibana_task_manager'
  ): Promise<{ tasksCount: number; actionTaskParamsCount: number }> => {
    const esClient: ElasticsearchClient = esServer.es.getClient();

    const actionTaskParamsResponse = await esClient.count({
      index: kibanaIndexName,
      body: {
        query: {
          bool: { must: { term: { type: 'action_task_params' } } },
        },
      },
    });
    const tasksResponse = await esClient.count({
      index: taskManagerIndexName,
      body: {
        query: {
          bool: { must: { term: { type: 'task' } } },
        },
      },
    });

    return {
      actionTaskParamsCount: actionTaskParamsResponse.count,
      tasksCount: tasksResponse.count,
    };
  };

  it('filters out all outdated action_task_params and action tasks', async () => {
    esServer = await startES();

    // Verify counts in current index before migration starts
    expect(await getCounts()).toEqual({
      actionTaskParamsCount: 2010,
      tasksCount: 2020,
    });

    root = createRoot();
    await root.preboot();
    await root.setup();
    await root.start();

    // Bulk of tasks should have been filtered out of current index
    const { actionTaskParamsCount, tasksCount } = await getCounts();
    // Use toBeLessThan to avoid flakiness in the case that TM starts manipulating docs before the counts are taken
    expect(actionTaskParamsCount).toBeLessThan(1000);
    expect(tasksCount).toBeLessThan(1000);

    // Verify that docs were not deleted from old index
    expect(await getCounts('.kibana_7.13.5_001', '.kibana_task_manager_7.13.5_001')).toEqual({
      actionTaskParamsCount: 2010,
      tasksCount: 2020,
    });
  });
});

function createRoot() {
  return kbnTestServer.createRootWithCorePlugins(
    {
      migrations: {
        skip: false,
        batchSize: 250,
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
