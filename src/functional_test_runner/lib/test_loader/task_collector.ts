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
import { SuiteDefinition } from './suite_definition';
import { TestFn } from './test';

export class TaskCollector {
  public rootSuite = new SuiteDefinition(undefined, undefined, false, false);
  private readonly suiteStack: SuiteDefinition[] = [this.rootSuite];

  public addSuite(
    name: string,
    provider: () => void,
    method: string,
    markedSkip: boolean,
    markedOnly: boolean
  ) {
    if (typeof name !== 'string' || typeof provider !== 'function') {
      throw new Error(`Unexpected arguments to ${method}(${name}, ${provider})`);
    }

    const suite = this.suiteStack[0].addChildSuite(name, markedSkip, markedOnly);

    this.suiteStack.unshift(suite);

    provider.call({
      tags(tags: string | string[]) {
        if (Array.isArray(tags)) {
          suite.tags = [...tags];
        } else {
          suite.tags = [tags];
        }
      },
    });

    this.suiteStack.shift();
  }

  public addTest(
    name: string,
    fn: TestFn,
    method: string,
    markedSkip: boolean,
    markedOnly: boolean
  ) {
    if (typeof name !== 'string' || typeof fn !== 'function') {
      throw new Error(`Unexpected arguments to ${method}(${name}, ${fn})`);
    }

    return this.suiteStack[0].addTest(name, fn, markedSkip, markedOnly);
  }

  public addHook(nameOrFn: string | TestFn, fn: TestFn | undefined, type: Hook['type']) {
    let name: string | undefined;

    if (typeof nameOrFn === 'string') {
      name = nameOrFn;
    } else {
      fn = nameOrFn;
      name = undefined;
    }

    if ((typeof name !== 'string' && typeof name !== 'undefined') || typeof fn !== 'function') {
      throw new Error(`Unexpected arguments to ${type}(${nameOrFn}, ${fn})`);
    }

    this.suiteStack[0].addHook(name, fn, type);
  }
}
