/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Joi from 'joi';
import {
  Logger,
  TaskDefinition,
  TaskDictionary,
  TaskManager,
  TaskPool,
  TaskStore,
  validateTaskDefinition,
} from './task_pool';
import { SanitizedTaskDefinition } from './task_pool/task';

// tslint:disable-next-line:no-default-export
export default function taskManager(kibana: any) {
  return new kibana.Plugin({
    id: 'taskManager',

    configPrefix: 'task_manager',

    require: ['kibana', 'elasticsearch'],

    config() {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        max_attempts: Joi.number()
          .description(
            'The maximum number of times a task will be attempted before being abandoned as failed'
          )
          .default(3),
        poll_interval: Joi.number()
          .description('How often, in milliseconds, the task manager will look for more work.')
          .default(3000),
        index: Joi.string()
          .description('The name of the index used to store task information.')
          .default('.kibana_task_manager'),
        num_workers: Joi.number()
          .description(
            'The maximum number of tasks that this Kibana instance will run simultaneously.'
          )
          .default(10),
      }).default();
    },

    async init(server: any) {
      const config = server.config();
      const logger = new Logger((...args) => server.log(...args));
      const callCluster = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
      const numWorkers = config.get('task_manager.num_workers');
      const store = new TaskStore({
        index: config.get('task_manager.index'),
        callCluster,
        maxAttempts: config.get('task_manager.max_attempts'),
      });

      logger.debug('Initializing the task manager index');
      await store.init();

      const definitions = extractTaskDefinitions(
        numWorkers,
        this.kbnServer.uiExports.taskDefinitions
      );

      const pool = new TaskPool({
        logger,
        callCluster,
        numWorkers,
        store,
        definitions,
        pollInterval: config.get('task_manager.poll_interval'),
        kbnServer: this.kbnServer,
      });

      pool.start();

      server.decorate(
        'server',
        'taskManager',
        new TaskManager({
          store,
          pool,
        })
      );
    },
  });
}

// TODO, move this to a file and properly test it, validate the taskDefinition via Joi or something
function extractTaskDefinitions(
  numWorkers: number,
  taskDefinitions: TaskDictionary<TaskDefinition> = {}
): TaskDictionary<SanitizedTaskDefinition> {
  return Object.keys(taskDefinitions).reduce(
    (acc, type) => {
      const rawDefinition = taskDefinitions[type];
      rawDefinition.type = type;
      const definition = Joi.attempt(rawDefinition, validateTaskDefinition) as TaskDefinition;
      const workersOccupied = Math.min(numWorkers, definition.workersOccupied || 1);

      acc[type] = {
        ...definition,
        workersOccupied,
      };

      return acc;
    },
    {} as TaskDictionary<SanitizedTaskDefinition>
  );
}
