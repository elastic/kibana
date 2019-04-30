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

import { Matcher } from './matcher';
import { Suite } from './suite';
import { SuiteDefinition } from './suite_definition';
import { Test, TestFn } from './test';

export class TestDefinition {
  public tags: string[] = [];

  constructor(
    public readonly name: string,
    public readonly fn: TestFn,
    public readonly parent: SuiteDefinition,
    public readonly skip: boolean,
    public readonly exclusive: boolean
  ) {}

  public finalize(matcher: Matcher, suite: Suite) {
    const test = new Test(this.name, this.fn, suite, this.skip, this.exclusive, this.tags);
    const { match, excluded } = matcher.match(this);

    if (match) {
      suite.tasks.push(test);
    } else if (excluded) {
      suite.excludedTasks.push(test);
    }

    return test;
  }
}
