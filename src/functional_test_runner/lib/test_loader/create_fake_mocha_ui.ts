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

import { TaskCollector } from './task_collector';

type SuiteFn = () => void;
type TestFn = () => Promise<void> | void;

export function createFakeMochaUi(taskCollector: TaskCollector) {
  const describe = Object.assign(
    (name: string, provider: SuiteFn) => {
      taskCollector.addSuite(name, provider, 'describe', false, false);
    },
    {
      only: (name: string, provider: SuiteFn) => {
        taskCollector.addSuite(name, provider, 'describe.only', false, true);
      },
      skip: (name: string, provider: SuiteFn) => {
        taskCollector.addSuite(name, provider, 'describe.skip', true, false);
      },
    }
  );

  const it = Object.assign(
    (name: string, fn: TestFn) => {
      const testDefinition = taskCollector.addTest(name, fn, 'it', false, false);
      return {
        tags(tags: string | string[]) {
          testDefinition.tags = ([] as string[]).concat(tags);
        },
        timeout(ms: number) {
          // TODO
        },
      };
    },
    {
      only: (name: string, fn: TestFn) => {
        taskCollector.addTest(name, fn, 'it.only', false, true);
      },
      skip: (name: string, fn: TestFn) => {
        taskCollector.addTest(name, fn, 'it.skip', true, false);
      },
    }
  );

  const before = (name: string | TestFn, fn?: TestFn) => {
    taskCollector.addHook(name, fn, 'before');
  };

  const beforeEach = (name: string | TestFn, fn?: TestFn) => {
    taskCollector.addHook(name, fn, 'beforeEach');
  };

  const afterEach = (name: string | TestFn, fn?: TestFn) => {
    taskCollector.addHook(name, fn, 'afterEach');
  };

  const after = (name: string | TestFn, fn?: TestFn) => {
    taskCollector.addHook(name, fn, 'after');
  };

  return {
    describe,
    it,
    before,
    beforeEach,
    afterEach,
    after,
  };
}
