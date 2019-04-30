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

import { SuiteFn } from './suite';
import { SuiteDefinition } from './suite_definition';
import { TestFn } from './test';
import { HookFn, HookType } from './hook';

interface SuiteModifier {
  tags(tags: string[]): this;
}

interface TestModifier {
  tags(tags: string[]): this;
  timeout(ms: number): this;
}

interface HookModifier {
  timeout(ms: number): this;
}

type TestDefiner = (name: string, tagsOrFn: string[] | TestFn, fn?: TestFn) => TestModifier;
type SuiteDefiner = (name: string, tagsOrFn: string[] | SuiteFn, fn?: SuiteFn) => SuiteModifier;
type HookDefiner = (nameOrFn: string | HookFn, fn?: HookFn) => HookModifier;

/**
 * Create the functions that will be exposed to the test files, which
 * when called in a specific order define the parts of the test suites
 * via the task *Definition objects and the rootSuite
 *
 * @param rootSuite
 */
export function createFakeMochaUi(rootSuite: SuiteDefinition) {
  const suiteStack = [rootSuite];

  const makeSuiteDefiner = (skip: boolean, only: boolean): SuiteDefiner => (
    name: string,
    tagsOrFn: SuiteFn | string[],
    fn?: SuiteFn
  ) => {
    if (typeof tagsOrFn !== 'function' && typeof fn !== 'function') {
      throw new Error(`the first or second argument to ${name}() must be a function`);
    }

    const [provider, suite] =
      typeof tagsOrFn === 'function'
        ? [tagsOrFn, suiteStack[0].addChildSuite(name, skip, only)]
        : [fn!, suiteStack[0].addChildSuite(name, skip, only, tagsOrFn)];

    suiteStack.unshift(suite);
    provider.call({
      tags(tags: string | string[]) {
        if (Array.isArray(tags)) {
          suite.tags = [...tags];
        } else {
          suite.tags = [tags];
        }
      },
    });
    suiteStack.shift();

    return {
      tags(tags: string | string[]) {
        suite.setTags(tags);
        return this;
      },
    };
  };

  const makeTestDefiner = (skip: boolean, only: boolean): TestDefiner => (
    name: string,
    tagsOrFn: TestFn | string[],
    fn?: TestFn
  ) => {
    if (typeof tagsOrFn !== 'function' && typeof fn !== 'function') {
      throw new Error(`the first or second argument to ${name}() must be a function`);
    }

    const test = Array.isArray(tagsOrFn)
      ? suiteStack[0].addTest(name, fn, skip, only, tagsOrFn)
      : suiteStack[0].addTest(name, tagsOrFn, skip, only, []);

    return {
      tags(tags: string | string[]) {
        test.setTags(tags);
        return this;
      },

      timeout(ms: number) {
        test.setTimeout(ms);
        return this;
      },
    };
  };

  const makeHookDefiner = (type: HookType): HookDefiner => (
    nameOrFn: string | HookFn,
    fn?: HookFn
  ) => {
    if (typeof nameOrFn !== 'function' && typeof fn !== 'function') {
      throw new Error(`the first or second argument to ${type} must be a function`);
    }

    const hook =
      typeof nameOrFn === 'function'
        ? suiteStack[0].addHook(type, undefined, nameOrFn)
        : suiteStack[0].addHook(type, nameOrFn, fn!);

    return {
      timeout(ms: number) {
        hook.setTimeout(ms);
        return this;
      },
    };
  };

  return {
    describe: Object.assign(makeSuiteDefiner(false, false), {
      skip: makeSuiteDefiner(true, false),
      only: makeSuiteDefiner(false, true),
    }),

    before: makeHookDefiner('before'),
    beforeEach: makeHookDefiner('beforeEach'),

    it: Object.assign(makeTestDefiner(false, false), {
      skip: makeTestDefiner(true, false),
      only: makeTestDefiner(false, true),
    }),

    afterEach: makeHookDefiner('afterEach'),
    after: makeHookDefiner('after'),
  };
}
