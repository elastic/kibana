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

import { TaskInstance } from './task';
import { TaskManager } from './task_manager';
import { FetchOpts, FetchResult } from './task_pool/task_store';

export class TaskManagerClientWrapper {
  private client: TaskManager | null;

  constructor(
    private logger: TaskManagerLogger,
    private totalCapacity: number,
    private definitions: TaskDictionary<SanitizedTaskDefinition>
  ) {
    this.client = null;
  }

  public async setClient(
    cb: (
      logger: TaskManagerLogger,
      totalCapacity: number,
      definitions: TaskDictionary<SanitizedTaskDefinition>
    ) => Promise<TaskManager>
  ) {
    this.client = await cb(this.logger, this.totalCapacity, this.definitions);
  }

  public schedule(task: TaskInstance) {
    return this.client ? this.client.schedule(task) : null;
  }

  public remove(id: string) {
    return this.client ? this.client.remove(id) : null;
  }

  public fetch(opts: FetchOpts = {}) {
    return this.client ? this.client.fetch(opts) : null;
  }
}
