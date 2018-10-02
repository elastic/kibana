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

/*
 * The TaskManager is the public interface into the task manager system. This glues together
 * all of the disparate modules in one integration point. The task manager operates in two different ways:
 *
 * - pre-init, it allows middleware registration, but disallows task manipulation
 * - post-init, it disallows middleware registration, but allows task manipulation
 *
 * Due to its complexity, this is mostly tested by integration tests (see readme).
 */

import { extractTaskDefinitions } from './lib/extract_task_definitions';
import { fillPool } from './lib/fill_pool';
import { TaskManagerLogger } from './lib/logger';
import { addMiddlewareToChain, BeforeSaveMiddlewareParams, Middleware } from './lib/middleware';
import { ConcreteTaskInstance, RunContext, TaskInstance } from './task';
import { TaskPoller } from './task_poller';
import { TaskPool } from './task_pool';
import { TaskManagerRunner } from './task_runner';
import { FetchOpts, TaskStore } from './task_store';

export async function taskManagerMixin(server: any, config: any) {
  const taskManager = new TaskManager();
  server.decorate('server', 'taskManager', taskManager);
}

/**
 * The public interface into the task manager system.
 */
class TaskManager {
  private isInitialized = false;
  private store?: TaskStore;
  private poller?: TaskPoller;
  private middleware = {
    beforeSave: async (saveOpts: BeforeSaveMiddlewareParams) => saveOpts,
    beforeRun: async (runOpts: RunContext) => runOpts,
  };

  /**
   * Initializes the task manager, preventing any further addition of middleware,
   * enabling the task manipulation methods, and beginning the background polling
   * mechanism. We can't do this in a constructor due to the fact that the constructor
   * is called before the elasticsearch plugin is available.
   */
  public init(kbnServer: any, server: any, config: any) {
    this.assertUninitialized('initialize');

    const logger = new TaskManagerLogger((...args: any[]) => server.log(...args));

    if (!server.plugins.elasticsearch) {
      logger.warning(
        'The task manager cannot be initialized when the elasticsearch plugin is disabled.'
      );
      return;
    }

    const maxWorkers = config.get('task_manager.max_workers');
    const definitions = extractTaskDefinitions(
      maxWorkers,
      kbnServer.uiExports.taskDefinitions,
      config.get('task_manager.override_num_workers')
    );
    const store = new TaskStore({
      callCluster: server.plugins.elasticsearch.getCluster('admin').callWithInternalUser,
      index: config.get('task_manager.index'),
      maxAttempts: config.get('task_manager.max_attempts'),
      supportedTypes: Object.keys(definitions),
    });
    const pool = new TaskPool({
      logger,
      maxWorkers,
    });
    const createRunner = (instance: ConcreteTaskInstance) =>
      new TaskManagerRunner({
        logger,
        kbnServer,
        instance,
        store,
        definition: definitions[instance.taskType],
        beforeRun: this.middleware.beforeRun,
      });
    const poller = new TaskPoller({
      logger,
      pollInterval: config.get('task_manager.poll_interval'),
      work() {
        return fillPool(pool.run, store.fetchAvailableTasks, createRunner);
      },
    });

    server.plugins.elasticsearch.status.on('red', () => {
      logger.debug('Lost connection to Elasticsearch, stopping the poller.');
      poller.stop();
    });

    server.plugins.elasticsearch.status.on('green', async () => {
      logger.debug('Initializing store');
      await store.init();
      logger.debug('Starting poller');
      await poller.start();
      logger.info('Connected to Elasticsearch, and watching for tasks');
    });

    this.store = store;
    this.poller = poller;
    this.isInitialized = true;
  }

  /**
   * Adds middleware to the task manager, such as adding security layers, loggers, etc.
   *
   * @param {Middleware} middleware - The middlware being added.
   */
  public addMiddleware(middleware: Middleware) {
    this.assertUninitialized('add middleware');
    const prevMiddleWare = this.middleware;
    this.middleware = addMiddlewareToChain(prevMiddleWare, middleware);
  }

  /**
   * Schedules a task.
   *
   * @param task - The task being scheduled.
   */
  public async schedule(taskInstance: TaskInstance, options?: any) {
    this.assertInitialized();
    const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
      ...options,
      taskInstance,
    });
    const result = await this.store!.schedule(modifiedTask);
    this.poller!.attemptWork();
    return result;
  }

  /**
   * Fetches a paginatable list of scheduled tasks.
   *
   * @param opts - The query options used to filter tasks
   */
  public async fetch(opts: FetchOpts) {
    this.assertInitialized();
    return this.store!.fetch(opts);
  }

  /**
   * Removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  public async remove(id: string) {
    this.assertInitialized();
    return this.store!.remove(id);
  }

  private assertUninitialized(message: string) {
    if (this.isInitialized) {
      throw new Error(`Cannot ${message} after the task manager is initialized.`);
    }
  }

  private assertInitialized() {
    if (!this.isInitialized) {
      throw new Error('The task manager is initializing.');
    }
  }
}
