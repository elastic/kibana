/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ElasticsearchOutputWriteTargets } from '../../lib/output/to_elasticsearch_output';
import { Logger } from './logger';

export async function cleanWriteTargets({
  writeTargets,
  client,
  logger,
}: {
  writeTargets: ElasticsearchOutputWriteTargets;
  client: Client;
  logger: Logger;
}) {
  const targets = Object.values(writeTargets);

  logger.info(`Cleaning indices: ${targets.join(', ')}`);

  const response = await client.deleteByQuery({
    index: targets,
    allow_no_indices: true,
    conflicts: 'proceed',
    refresh: true,
    body: {
      query: {
        match_all: {},
      },
    },
    wait_for_completion: false,
  });

  const task = response.task;

  if (task) {
    await new Promise<void>((resolve, reject) => {
      const pollForTaskCompletion = async () => {
        const taskResponse = await client.tasks.get({
          task_id: String(task),
        });

        logger.debug(
          `Polled for task:\n${JSON.stringify(taskResponse, ['completed', 'error'], 2)}`
        );

        if (taskResponse.completed) {
          resolve();
        } else if (taskResponse.error) {
          reject(taskResponse.error);
        } else {
          setTimeout(pollForTaskCompletion, 2500);
        }
      };

      pollForTaskCompletion();
    });
  }
}
