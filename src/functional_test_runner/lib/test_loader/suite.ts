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

import { Hook } from './hook';
import { Test } from './test';

export type SuiteFn = () => void;

export class Suite {
  public readonly tasks: Array<Test | Suite> = [];
  public readonly excludedTasks: Array<Test | Suite> = [];

  constructor(
    public readonly name: string | undefined,
    public readonly parent: Suite | undefined,
    public tags: string[] = [],
    public readonly skip: boolean,
    public readonly exclusive: boolean,
    public readonly hooks: Hook[] = []
  ) {}

  public countTests(): number {
    return this.tasks.reduce(
      (acc, task) => acc + (task instanceof Test ? 1 : task.countTests()),
      0
    );
  }

  public getExcludedTests() {
    const reducer = (acc: Test[], task: Suite | Test) =>
      acc.concat(task instanceof Test ? task : collectAll(task));

    const collectAll = (task: Suite): Test[] =>
      [...task.excludedTasks, ...task.tasks].reduce(reducer, []);

    return this.excludedTasks.reduce(reducer, []);
  }

  public *ittrOwnHooks(type: Hook['type']) {
    for (const hook of this.hooks) {
      if (hook.type === type) {
        yield hook;
      }
    }
  }
}
