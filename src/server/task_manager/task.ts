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

/*
 * Type definitions and validations for tasks.
 */

/**
 * A loosely typed definition of the elasticjs wrapper. It's beyond the scope
 * of this work to try to make a comprehensive type definition of this.
 */
export type ElasticJs = (action: string, args: any) => Promise<any>;

/**
 * The run context is passed into a task's run function as its sole argument.
 */
export interface RunContext {
  /**
   * The elastic search js wrapper function which the task can use
   * to access Elastic.
   */
  callCluster: ElasticJs;

  /**
   * The Kibana server object. This gives tasks full-access to the server object,
   * but if the task needs to query ES in the context of the user who scheduled
   * the task, it hsould use `callCluster` rather than the various ES options
   * available in kbnServer.
   */
  kbnServer: object;

  /**
   * The document describing the task instance, its params, state, id, etc.
   */
  taskInstance: ConcreteTaskInstance;
}

/**
 * The return value of a task's run function should be a promise of RunResult.
 */
export interface RunResult {
  /**
   * Specifies the next run date / time for this task. If unspecified, the system
   * will reschedule the task based on the interval defined by the tasks' definition.
   * If there is no runAt and there is no interval in the task's definition, this
   * is treated as a single-run task, and will not be rescheduled after completion.
   */
  runAt?: Date;

  /**
   * If specified, indicates that the task failed to accomplish its work. This is
   * logged out as a warning, and the task will be reattempted after a delay.
   */
  error?: object;

  /**
   * The state which will be passed to the next run of this task (if this is a
   * recurring task). See the RunContext type definition for more details.
   */
  state?: object;
}

export const validateRunResult = Joi.object({
  runAt: Joi.date().optional(),
  error: Joi.object().optional(),
  state: Joi.object().optional(),
}).optional();

export type RunFunction = () => PromiseLike<RunResult | undefined>;

export type CancelFunction = () => PromiseLike<RunResult | undefined>;

export type TaskRunCreatorFunction = (
  context: RunContext
) => { run: RunFunction; cancel?: CancelFunction };

/**
 * Defines a task which can be scheduled and run by the Kibana
 * task manager.
 */
export interface TaskDefinition {
  /**
   * A unique identifier for the type of task being defined.
   */
  type: string;

  /**
   * A brief, human-friendly title for this task.
   */
  title: string;

  /**
   * An optional more detailed description of what this task does.
   */
  description?: string;

  /**
   * How long, in minutes, the system should wait for the task to complete
   * before it is considered to be timed out. (e.g. '5m', the default). If
   * the task takes longer than this, Kibana will send it a kill command and
   * the task will be re-attempted.
   */
  timeOut?: string;

  /**
   * The numer of workers / slots a running instance of this task occupies.
   * This defaults to 1.
   */
  numWorkers?: number;

  createTaskRunner: TaskRunCreatorFunction;
}

/**
 * A task definition with all of its properties set to a valid value.
 */
export interface SanitizedTaskDefinition extends TaskDefinition {
  numWorkers: number;
}

export const validateTaskDefinition = Joi.object({
  type: Joi.string().required(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  timeOut: Joi.string().default('5m'),
  numWorkers: Joi.number().default(1),
  createTaskRunner: Joi.func().required(),
}).default();

/**
 * A dictionary mapping task types to their definitions.
 */
export interface TaskDictionary<T extends TaskDefinition> {
  [taskType: string]: T;
}

export type TaskStatus = 'idle' | 'running';

/*
 * A task instance represents all of the data required to store, fetch,
 * and execute a task.
 */
export interface TaskInstance {
  /**
   * The task definition type whose run function will execute this instance.
   */
  taskType: string;

  /**
   * The date and time that this task is scheduled to be run. It is not guaranteed
   * to run at this time, but it is guaranteed not to run earlier than this.
   */
  runAt?: Date;

  /**
   * An interval in minutes (e.g. '5m'). If specified, this is a recurring task.
   */
  interval?: string;

  /**
   * A task-specific set of parameters, used by the task's run function to tailor
   * its work. This is generally user-input, such as { sms: '333-444-2222' }.
   */
  params: object;

  /**
   * The state passed into the task's run function, and returned by the previous
   * run. If there was no previous run, or if the previous run did not return
   * any state, this will be the empy object: {}
   */
  state?: object;

  /**
   * The id of the user who scheduled this task.
   */
  user?: string;

  /**
   * Used to group tasks for querying. So, reporting might schedule tasks with a scope of 'reporting',
   * and then query such tasks to provide a glimpse at only reporting tasks, rather than at all tasks.
   */
  scope?: string | string[];
}

/**
 * A task instance that has an id and is ready for storage.
 */
export interface ConcreteTaskInstance extends TaskInstance {
  /**
   * The id of the Elastic document that stores this instance's data.
   */
  id: string;

  /**
   * The version of the Elaticsearch document.
   */
  version: number;

  /**
   * The number of unsuccessful attempts since the last successful run. This
   * will be zeroed out after a successful run.
   */
  attempts: number;

  /**
   * Indicates whether or not the task is currently running.
   */
  status: TaskStatus;

  /**
   * The date and time that this task is scheduled to be run. It is not guaranteed
   * to run at this time, but it is guaranteed not to run earlier than this.
   */
  runAt: Date;

  /**
   * The state passed into the task's run function, and returned by the previous
   * run. If there was no previous run, or if the previous run did not return
   * any state, this will be the empy object: {}
   */
  state: object;
}
