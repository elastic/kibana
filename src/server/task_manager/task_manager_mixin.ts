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
import { TaskManagerLogger } from './logger';
import {
  SanitizedTaskDefinition,
  TaskDefinition,
  TaskDictionary,
  validateTaskDefinition,
} from './task';
import { TaskManager } from './task_manager';

export async function taskManagerMixin(kbnServer: any, server: any, config: any) {
  const logger = new TaskManagerLogger((...args: any[]) => server.log(...args));
  const maxWorkers = config.get('task_manager.max_workers');
  const definitions = extractTaskDefinitions(
    maxWorkers,
    kbnServer.uiExports.taskDefinitions,
    config.get('task_manager.override_num_workers')
  );

  const client = new TaskManager({ logger, maxWorkers, definitions });
  server.decorate('server', 'taskManager', client);
  kbnServer.afterPluginsInit(() => client.afterPluginsInit(kbnServer, server, config));
}

// TODO, move this to a file and properly test it
function extractTaskDefinitions(
  maxWorkers: number,
  taskDefinitions: TaskDictionary<TaskDefinition> = {},
  overrideNumWorkers: { [taskType: string]: number }
): TaskDictionary<SanitizedTaskDefinition> {
  return Object.keys(taskDefinitions).reduce(
    (acc, type) => {
      const rawDefinition = taskDefinitions[type];
      rawDefinition.type = type;
      const definition = Joi.attempt(rawDefinition, validateTaskDefinition) as TaskDefinition;
      const numWorkers = Math.min(
        maxWorkers,
        overrideNumWorkers[definition.type] || definition.numWorkers || 1
      );

      acc[type] = {
        ...definition,
        numWorkers,
      };

      return acc;
    },
    {} as TaskDictionary<SanitizedTaskDefinition>
  );
}
