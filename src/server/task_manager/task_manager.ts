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

import { ConcreteTaskInstance, TaskInstance } from './task';
import { TaskPoller } from './task_poller';
import { FetchOpts, FetchResult, RemoveResult, TaskStore } from './task_store';

interface Opts {
  poller: TaskPoller;
  store: TaskStore;
}

export class TaskManager {
  private poller: TaskPoller;
  private store: TaskStore;

  constructor(opts: Opts) {
    this.poller = opts.poller;
    this.store = opts.store;
  }

  public async schedule(task: TaskInstance): Promise<ConcreteTaskInstance> {
    const result = await this.store.schedule(task);
    this.poller.attemptWork();
    return result;
  }

  public fetch(opts: FetchOpts = {}): Promise<FetchResult> {
    return this.store.fetch(opts);
  }

  public remove(id: string): Promise<RemoveResult> {
    return this.store.remove(id);
  }
}
