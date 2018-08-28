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
import { ElasticJs, TaskDefinition, TaskDictionary } from './task';
import { TaskStore } from './task_store';
import { TypePool } from './type_pool';

interface Opts {
  callCluster: ElasticJs;
  logger: Logger;
  maxConcurrency: number;
  pollInterval: number;
  definitions: TaskDictionary;
  store: TaskStore;
}

interface PoolDictionary {
  [type: string]: TypePool;
}

export class TaskPool {
  private callCluster: ElasticJs;
  private pools: PoolDictionary;
  private maxConcurrency: number;
  private logger: Logger;
  private pollInterval: number;
  private store: TaskStore;
  private isChecking = false;
  private isPolling = false;

  constructor(opts: Opts) {
    this.callCluster = opts.callCluster;
    this.maxConcurrency = opts.maxConcurrency;
    this.logger = opts.logger;
    this.pollInterval = opts.pollInterval;
    this.store = opts.store;
    this.pools = Object.values(opts.definitions).reduce(
      (acc: PoolDictionary, definition: TaskDefinition) => {
        acc[definition.type] = new TypePool({
          definition,
          logger: opts.logger,
          store: this.store,
        });
        return acc;
      },
      {}
    );
  }

  get availableTypes() {
    return Object.keys(this.pools).filter(type => !this.pools[type].isFull);
  }

  get occupiedSlots() {
    return Object.values(this.pools).reduce((x, pool) => x + pool.occupiedSlots, 0);
  }

  get availableSlots() {
    return this.maxConcurrency - this.occupiedSlots;
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

    while (this.availableSlots > 0) {
      const instances = await this.store.availableTasks({
        types: this.availableTypes,
        size: this.availableSlots,
      });

      // There's no more work for us in the index
      if (!instances.length) {
        break;
      }

      // Try to claim tasks
      for (const instance of instances) {
        await this.pools[instance.type].run(this.callCluster, instance, this.checkForWork);
      }
    }

    this.isChecking = false;
  };

  private checkForExpiredTasks() {
    Object.values(this.pools).forEach(p => p.checkForExpiredTasks());
  }
}
