/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Root } from '@kbn/core-root-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';

const logFilePath = Path.join(__dirname, '7_13_failed_action_tasks.log');

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await fs.unlink(logFilePath).catch(() => void 0);
}

describe('migration from 7.13 to 7.14+ with many failed action_tasks', () => {
  describe('if mappings are incompatible (reindex required)', () => {
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
            dataArchive: Path.join(
              __dirname,
              '..',
              'archives',
              '7.13_1.5k_failed_action_tasks.zip'
            ),
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

      const {
        actionTaskParamsCount: oldIndexActionTaskParamsCount,
        tasksCount: oldIndexTasksCount,
      } = await getCounts('.kibana_7.13.5_001', '.kibana_task_manager_7.13.5_001');

      // .kibana mappings changes are NOT compatible, we reindex and preserve old index's documents
      expect(oldIndexActionTaskParamsCount).toEqual(2010);

      // ATM .kibana_task_manager mappings changes are compatible, we skip reindex and actively delete unwanted documents
      // if the mappings become incompatible in the future, the we will reindex and the old index must still contain all 2020 docs
      // if the mappings remain compatible, we reuse the existing index and actively delete unwanted documents from it
      expect(oldIndexTasksCount === 2020 || oldIndexTasksCount < 1000).toEqual(true);
    });
  });
});

function createRoot() {
  return createRootWithCorePlugins(
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
