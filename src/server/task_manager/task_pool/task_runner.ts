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
  ConcreteTaskInstance,
  ElasticJs,
  RunContext,
  RunResult,
  TaskDefinition,
  validateRunResult,
} from './task';
import { intervalFromNow, minutesFromNow } from './task_intervals';

interface Logger {
  info: (msg: string) => void;
  debug: (msg: string) => void;
  warning: (msg: string) => void;
}

interface Updatable {
  update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance>;
  remove(id: string): Promise<void>;
}

interface Opts {
  logger: Logger;
  callCluster: ElasticJs;
  definition: TaskDefinition;
  instance: ConcreteTaskInstance;
  store: Updatable;
  kbnServer: object;
}

export class TaskRunner {
  private promise?: PromiseLike<RunResult | undefined>;
  private instance: ConcreteTaskInstance;
  private definition: TaskDefinition;
  private logger: Logger;
  private store: Updatable;
  private context: RunContext;

  constructor(opts: Opts) {
    this.instance = opts.instance;
    this.definition = opts.definition;
    this.logger = opts.logger;
    this.store = opts.store;
    this.context = {
      callCluster: opts.callCluster,
      params: opts.instance.params || {},
      state: opts.instance.state || {},
      kbnServer: opts.kbnServer,
    };
  }

  public get id() {
    return this.instance.id;
  }

  public get type() {
    return this.instance.taskType;
  }

  public get isTimedOut() {
    return this.instance.runAt < new Date();
  }

  public toString() {
    return `${this.instance.taskType} "${this.instance.id}"`;
  }

  public async run(): Promise<RunResult> {
    try {
      this.logger.debug(`Running task ${this}`);
      this.promise = this.definition.run(this.context);
      return this.processResult(this.validateResult(await this.promise));
    } catch (error) {
      this.logger.warning(`Task ${this} failed ${error.stack}`);
      this.logger.debug(`Task ${JSON.stringify(this.instance)} failed ${error.stack}`);

      return this.processResult({ error });
    }
  }

  public async claimOwnership() {
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

  public async cancel() {
    const promise: any = this.promise;

    if (promise && promise.cancel) {
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
