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

import { Logger } from './logger';
import { ConcreteTaskInstance, ElasticJs, SanitizedTaskDefinition, TaskDictionary } from './task';
import { TaskRunner } from './task_runner';
import { TaskStore } from './task_store';

interface Opts {
  callCluster: ElasticJs;
  logger: Logger;
  numWorkers: number;
  pollInterval: number;
  definitions: TaskDictionary<SanitizedTaskDefinition>;
  store: TaskStore;
  kbnServer: object;
}

export class TaskPool {
  private callCluster: ElasticJs;
  private running = new Set<TaskRunner>();
  private cancelling = new Set<TaskRunner>();
  private numWorkers: number;
  private logger: Logger;
  private pollInterval: number;
  private store: TaskStore;
  private isChecking = false;
  private isPolling = false;
  private definitions: TaskDictionary<SanitizedTaskDefinition>;
  private availableTypes: string[];
  private kbnServer: object;

  constructor(opts: Opts) {
    this.callCluster = opts.callCluster;
    this.numWorkers = opts.numWorkers;
    this.logger = opts.logger;
    this.pollInterval = opts.pollInterval;
    this.store = opts.store;
    this.definitions = opts.definitions;
    this.availableTypes = Object.values(opts.definitions).map(d => d.type);
    this.kbnServer = opts.kbnServer;
  }

  get occupiedSlots() {
    let total = 0;

    this.running.forEach(t => {
      total += this.definitions[t.type].workersOccupied;
    });

    return total;
  }

  get availableSlots() {
    return this.numWorkers - this.occupiedSlots;
  }

  public start() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;

    const poll = async () => {
      try {
        await this.checkForWork();
        await this.checkForExpiredTasks();
      } catch (error) {
        this.logger.warning(`Task pool failed to poll. ${error.stack}`);
      }
      setTimeout(poll, this.pollInterval);
    };

    poll();
  }

  public checkForWork = async () => {
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;

    try {
      while (true) {
        const instances = await this.store.availableTasks({
          types: this.availableTypes,
          size: this.availableSlots,
        });

        // There's no more work for us in the index
        if (!instances.length) {
          return;
        }

        // Try to claim tasks
        for (const instance of instances) {
          if (this.availableSlots < this.definitions[instance.taskType].workersOccupied) {
            return;
          }

          await this.run(instance);
        }
      }
    } finally {
      this.isChecking = false;
    }
  };

  private async run(instance: ConcreteTaskInstance) {
    const task = new TaskRunner({
      instance,
      callCluster: this.callCluster,
      definition: this.definitions[instance.taskType],
      logger: this.logger,
      store: this.store,
      kbnServer: this.kbnServer,
    });

    if (await task.claimOwnership()) {
      this.running.add(task);

      task.run().then(() => {
        this.running.delete(task);
        this.checkForWork();
      });
    }
  }

  private checkForExpiredTasks() {
    for (const task of this.running) {
      if (task.isTimedOut) {
        this.cancelling.add(task);
        this.running.delete(task);

        task
          .cancel()
          .catch(error => this.logger.warning(`Failed to cancel task ${task}. ${error.stack}`))
          .then(() => this.cancelling.delete(task));
      }
    }
  }
}
