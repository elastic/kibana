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
import { Logger } from './logger';
import {
  ConcreteTaskInstance,
  RunContext,
  RunResult,
  TaskDefinition,
  validateRunResult,
} from './task';
import { intervalFromNow, minutesFromNow } from './task_intervals';

export interface TaskRunner {
  numWorkers: number;
  isExpired: boolean;
  cancel: () => Promise<void>;
  claimOwnership: () => Promise<boolean>;
  run: () => Promise<RunResult>;
  toString?: () => string;
}

interface Updatable {
  update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance>;
  remove(id: string): Promise<void>;
}

type ContextProvider = (instance: ConcreteTaskInstance) => Promise<RunContext>;

interface Opts {
  logger: Logger;
  definition: TaskDefinition;
  instance: ConcreteTaskInstance;
  store: Updatable;
  contextProvider: ContextProvider;
}

/**
 * Runs a background task, ensures that errors are properly handled,
 * allows for cancellation.
 *
 * @export
 * @class TaskManagerRunner
 * @implements {TaskRunner}
 */
export class TaskManagerRunner implements TaskRunner {
  private promise?: PromiseLike<RunResult | undefined>;
  private instance: ConcreteTaskInstance;
  private definition: TaskDefinition;
  private logger: Logger;
  private store: Updatable;
  private contextProvider: ContextProvider;

  /**
   * Creates an instance of TaskManagerRunner.
   * @param {Opts} opts
   * @prop {Logger} logger - The task manager logger
   * @prop {TaskDefinition} definition - The definition of the task being run
   * @prop {ConcreteTaskInstance} instance - The record describing this particular task instance
   * @prop {Updatable} store - The store used to read / write tasks instance info
   * @prop {ContextProvider} contextProvider - An async function that provides the task's run context
   * @memberof TaskManagerRunner
   */
  constructor(opts: Opts) {
    this.instance = sanitizeInstance(opts.instance);
    this.definition = opts.definition;
    this.logger = opts.logger;
    this.store = opts.store;
    this.contextProvider = opts.contextProvider;
  }

  /**
   * Gets how many workers are occupied by this task instance.
   *
   * @readonly
   * @memberof TaskManagerRunner
   */
  public get numWorkers() {
    return this.definition.numWorkers || 1;
  }

  /**
   * Gets the id of this task instance.
   *
   * @readonly
   * @memberof TaskManagerRunner
   */
  public get id() {
    return this.instance.id;
  }

  /**
   * Gets the task type of this task instance.
   *
   * @readonly
   * @memberof TaskManagerRunner
   */
  public get taskType() {
    return this.instance.taskType;
  }

  /**
   * Gets whether or not this task has run longer than its expiration setting allows.
   *
   * @readonly
   * @memberof TaskManagerRunner
   */
  public get isExpired() {
    return this.instance.runAt < new Date();
  }

  /**
   * Returns a log-friendly representation of this task.
   *
   * @returns
   * @memberof TaskManagerRunner
   */
  public toString() {
    return `${this.instance.taskType} "${this.instance.id}"`;
  }

  /**
   * Runs the task, handling the task result, errors, etc, rescheduling if need be.
   *
   * @returns {Promise<RunResult>}
   * @memberof TaskManagerRunner
   */
  public async run(): Promise<RunResult> {
    try {
      this.logger.debug(`Running task ${this}`);
      const context = await this.contextProvider(this.instance);
      const taskRunner = this.definition.createTaskRunner(context);
      this.promise = taskRunner.run();
      return this.processResult(this.validateResult(await this.promise));
    } catch (error) {
      this.logger.warning(`Task ${this} failed ${error.stack}`);
      this.logger.debug(`Task ${JSON.stringify(this.instance)} failed ${error.stack}`);

      return this.processResult({ error });
    }
  }

  /**
   * Attempts to claim exclusive rights to run the task. If the attempt fails
   * with a 409 (http conflict), we assume another Kibana instance beat us to the punch.
   *
   * @returns
   * @memberof TaskManagerRunner
   */
  public async claimOwnership(): Promise<boolean> {
    const VERSION_CONFLICT_STATUS = 409;

    try {
      this.instance = await this.store.update({
        ...this.instance,
        status: 'running',
        runAt: intervalFromNow(this.definition.timeOut)!,
      });

      return true;
    } catch (error) {
      if (error.statusCode !== VERSION_CONFLICT_STATUS) {
        throw error;
      }
    }

    return false;
  }

  /**
   * Attempts to cancel the task.
   *
   * @returns
   * @memberof TaskManagerRunner
   */
  public async cancel() {
    const promise: any = this.promise;

    if (promise && promise.cancel) {
      this.promise = undefined;
      return promise.cancel();
    }

    this.logger.warning(`The task ${this} is not cancellable.`);
  }

  private validateResult(result?: RunResult): RunResult {
    const { error } = Joi.validate(result, validateRunResult);

    if (error) {
      this.logger.warning(`Invalid task result for ${this}: ${error.message}`);
    }

    return result || {};
  }

  private async processResult(result: RunResult): Promise<RunResult> {
    const runAt = result.runAt || intervalFromNow(this.instance.interval);
    const state = result.state || this.instance.state || {};

    if (runAt || result.error) {
      await this.store.update({
        ...this.instance,
        runAt: runAt || minutesFromNow((this.instance.attempts + 1) * 5),
        state,
        attempts: result.error ? this.instance.attempts + 1 : 0,
      });
    } else {
      await this.store.remove(this.instance.id);
    }

    return result;
  }
}

function sanitizeInstance(instance: ConcreteTaskInstance): ConcreteTaskInstance {
  return {
    ...instance,
    params: instance.params || {},
    state: instance.state || {},
  };
}
