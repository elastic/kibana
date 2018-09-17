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

import { fillPool } from './fill_pool';
import { TaskManagerLogger } from './logger';
import { addMiddlewareToChain, BeforeSaveMiddlewareParams, Middleware } from './middleware';
import {
  ConcreteTaskInstance,
  RunContext,
  SanitizedTaskDefinition,
  TaskDictionary,
  TaskInstance,
} from './task';
import { TaskPoller } from './task_poller';
import { TaskPool } from './task_pool';
import { TaskManagerRunner } from './task_runner';
import { FetchOpts, FetchResult, RawTaskDoc, RemoveResult, TaskStore } from './task_store';

interface ConstructOpts {
  logger: TaskManagerLogger;
  maxWorkers: number;
  definitions: TaskDictionary<SanitizedTaskDefinition>;
}

export class TaskManager {
  private logger: TaskManagerLogger;
  private maxWorkers: number;
  private definitions: TaskDictionary<SanitizedTaskDefinition>;
  private middleware: Middleware;
  private poller: TaskPoller | null;
  private store: TaskStore | null;
  private initialized: boolean;

  constructor(opts: ConstructOpts) {
    this.initialized = false;

    const { logger, maxWorkers, definitions } = opts;
    this.logger = logger;
    this.maxWorkers = maxWorkers;
    this.definitions = definitions;

    this.middleware = {
      beforeSave: async (saveOpts: BeforeSaveMiddlewareParams) => saveOpts,
      beforeRun: async (runOpts: RunContext) => runOpts,
    };

    this.poller = null;
    this.store = null;
  }

  public async afterPluginsInit(kbnServer: any, server: any, config: any) {
    const callCluster = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
    const store = new TaskStore({
      index: config.get('task_manager.index'),
      callCluster,
      maxAttempts: config.get('task_manager.max_attempts'),
      supportedTypes: Object.keys(this.definitions),
    });
    this.store = store;

    this.logger.debug('Initializing the task manager index');
    await store.init();

    const pool = new TaskPool({
      logger: this.logger,
      maxWorkers: this.maxWorkers,
    });

    const poller = new TaskPoller({
      logger: this.logger,
      pollInterval: config.get('task_manager.poll_interval'),
      work: () =>
        fillPool(
          pool.run,
          store.fetchAvailableTasks,
          (instance: ConcreteTaskInstance) =>
            new TaskManagerRunner({
              logger: this.logger,
              definition: this.definitions[instance.taskType],
              kbnServer,
              instance,
              store,
              beforeRun: this.middleware.beforeRun,
            })
        ),
    });
    this.poller = poller;
    await this.poller.start();

    this.initialized = true;
  }

  public addMiddleware(middleware: Middleware) {
    const prevMiddleWare = this.middleware;
    this.middleware = addMiddlewareToChain(prevMiddleWare, middleware);
  }

  /*
   * Saves a task
   * @param {TaskInstance} taskInstance
   */
  public async schedule(taskInstance: TaskInstance, options?: any): Promise<RawTaskDoc> {
    if (!this.initialized || !this.poller || !this.store) {
      throw new Error('Task Manager service is not ready for tasks to be scheduled');
    }
    const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
      ...options,
      taskInstance,
    });
    const result = await this.store.schedule(modifiedTask);
    this.poller.attemptWork();
    return result;
  }

  public fetch(opts: FetchOpts = {}): Promise<FetchResult> | null {
    if (!this.initialized || !this.store) {
      throw new Error('Task Manager service is not ready to fetch tasks');
    }
    return this.store.fetch(opts);
  }

  public remove(id: string): Promise<RemoveResult> | null {
    if (!this.initialized || !this.store) {
      throw new Error('Task Manager service is not ready to remove a task');
    }
    return this.store.remove(id);
  }
}
