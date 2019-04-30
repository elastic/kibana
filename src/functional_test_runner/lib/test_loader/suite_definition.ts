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
import { Matcher } from './matcher';
import { Suite } from './suite';
import { TestFn } from './test';
import { TestDefinition } from './test_definition';

export class SuiteDefinition {
  public readonly tasks: Array<TestDefinition | SuiteDefinition> = [];
  public readonly hooks: Hook[] = [];
  public tags: string[] = [];

  constructor(
    public readonly name: string | undefined,
    public readonly parent: SuiteDefinition | undefined,
    public readonly skip: boolean,
    public readonly exclusive: boolean
  ) {}

  public addChildSuite(name: string, skip: boolean, exclusive: boolean) {
    const suite = new SuiteDefinition(name, this, skip, exclusive);
    this.tasks.push(suite);
    return suite;
  }

  public addTest(name: string, fn: TestFn, skip: boolean, exclusive: boolean) {
    const test = new TestDefinition(name, fn, this, skip, exclusive);
    this.tasks.push(test);
    return test;
  }

  public addHook(name: string | undefined, fn: TestFn, type: Hook['type']) {
    this.hooks.push(new Hook(name, fn, type));
  }

  public hasAnyExclusiveChildren() {
    for (const task of this.tasks) {
      if (task.exclusive || (task instanceof SuiteDefinition && task.hasAnyExclusiveChildren())) {
        return true;
      }
    }

    return false;
  }

  public finalize(matcher: Matcher, parent?: Suite) {
    const suite = new Suite(
      this.name,
      parent,
      this.tags,
      !!this.skip,
      !!this.exclusive,
      this.hooks
    );

    const { match, excluded, childMatcher } = matcher.match(this);
    for (const task of this.tasks) {
      task.finalize(childMatcher || matcher, suite);
    }

    if (parent) {
      if (match && suite.tasks.length) {
        parent.tasks.push(suite);
      } else if (excluded) {
        parent.excludedTasks.push(suite);
      }
    }

    return suite;
  }
}
