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
 * Due to its coplexity, this is mostly tested by integration tests (see readme).
 */

import { extractTaskDefinitions } from './lib/extract_task_definitions';
import { fillPool } from './lib/fill_pool';
import { TaskManagerLogger } from './lib/logger';
import { addMiddlewareToChain, BeforeSaveMiddlewareParams, Middleware } from './lib/middleware';
import { ConcreteTaskInstance, RunContext, TaskInstance } from './task';
import { TaskPoller } from './task_poller';
import { TaskPool } from './task_pool';
import { TaskManagerRunner } from './task_runner';
import { FetchOpts, FetchResult, RemoveResult, TaskStore } from './task_store';

type ScheduleFn = (taskInstance: TaskInstance, options?: any) => Promise<ConcreteTaskInstance>;
type FetchFn = (opts: FetchOpts) => Promise<FetchResult>;
type RemoveFn = (id: string) => Promise<RemoveResult>;

export interface TaskManagerOpts {
  kbnServer: any;
  server: any;
  config: any;
}

const UNINITIALIZED_ERROR = 'The task manager is still initializing.';

/**
 * The public interface into the task manager system.
 */
export class TaskManager {
  /**
   * Schedules a task.
   *
   * @param {TaskInstance} taskInstance - The metadata describing the task to be run / scheduled.
   * @param {any} options - Contextual options such as an HTTP request, that may be used by middleware.
   */
  public schedule: ScheduleFn = unsupportedFunction(UNINITIALIZED_ERROR);

  /**
   * Fetches a paginatable set of scheduled and / or running tasks.
   *
   * @param {FetchOpts} opts - Options for searching the set of scheduled tasks.
   */
  public fetch: FetchFn = unsupportedFunction(UNINITIALIZED_ERROR);

  /**
   * Removes a task. If the task is currently running, it will not be canceled, but will no longer
   * repeat, if it is a recurring task.
   *
   * @param {string} id - The id of the task to remove.
   */
  public remove: RemoveFn = unsupportedFunction(UNINITIALIZED_ERROR);

  // The middleware used to modify tasks before save and before run.
  private middleware: Middleware = {
    beforeSave: async (saveOpts: BeforeSaveMiddlewareParams) => saveOpts,
    beforeRun: async (runOpts: RunContext) => runOpts,
  };

  /**
   * Adds middleware to the task manager, such as adding security layers, loggers, etc.
   *
   * @param {Middleware} middleware - The middlware being added.
   */
  public addMiddleware = (middleware: Middleware) => {
    const prevMiddleWare = this.middleware;
    this.middleware = addMiddlewareToChain(prevMiddleWare, middleware);
  };

  /**
   * Initializes the task manager, starts the background polling, etc. After this,
   * middleware can no longer be added.
   */
  public init = (opts: TaskManagerOpts) => {
    this.init = unsupportedFunction('The task manager is already initialized.');

    const { middleware } = this;

    return initializeManager({ ...opts, middleware }).then(({ store, poller }) => {
      this.addMiddleware = () => {
        throw new Error('Cannot add middleware after the task manager is initialized.');
      };

      this.schedule = async (taskInstance: TaskInstance, options?: any) => {
        const { taskInstance: modifiedTask } = await middleware.beforeSave({
          ...options,
          taskInstance,
        });
        const result = await store.schedule(modifiedTask);
        poller.attemptWork();
        return result;
      };

      this.fetch = (...args) => store.fetch(...args);
      this.remove = (...args) => store.remove(...args);

      return { store, poller };
    });
  };
}

function unsupportedFunction(message: string) {
  return async () => {
    throw new Error(message);
  };
}

/**
 * Glues together all of the different task manager modules, initializes the store,
 * starts the poller, etc.
 *
 * @param opts
 */
async function initializeManager(opts: TaskManagerOpts & { middleware: Middleware }) {
  const { middleware, kbnServer, server, config } = opts;
  const logger = new TaskManagerLogger((...args: any[]) => server.log(...args));
  const maxWorkers = config.get('task_manager.max_workers');

  logger.debug('Extracting task definitions');
  const definitions = extractTaskDefinitions(
    maxWorkers,
    kbnServer.uiExports.taskDefinitions,
    config.get('task_manager.override_num_workers')
  );

  logger.debug('Creating the store');
  const store = new TaskStore({
    callCluster: server.plugins.elasticsearch.getCluster('admin').callWithInternalUser,
    index: config.get('task_manager.index'),
    maxAttempts: config.get('task_manager.max_attempts'),
    supportedTypes: Object.keys(definitions),
  });

  logger.debug('Creating the pool');
  const pool = new TaskPool({
    logger,
    maxWorkers,
  });

  logger.debug('Creating the poller');
  const createRunner = (instance: ConcreteTaskInstance) =>
    new TaskManagerRunner({
      logger,
      definition: definitions[instance.taskType],
      kbnServer,
      instance,
      store,
      beforeRun: middleware.beforeRun,
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

  return { store, poller };
}
