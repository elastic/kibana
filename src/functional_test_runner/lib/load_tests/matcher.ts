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

import { SuiteDefinition } from './suite_definition';
import { TestDefinition } from './test_definition';
import { getFullName, shareAnyItem } from './util';

type TaskDefinition = SuiteDefinition | TestDefinition;

interface Options {
  grep: string | undefined;
  invertGrep: boolean;
  excludeTags: string[];
  exclusive: boolean;
  includeTags: string[];
}

/**
 * Object that takes care of matching tests/suites (tasks)
 */
export class Matcher {
  private grep: string | undefined;
  private invertGrep: boolean;
  private excludeTags: string[];
  private exclusive: boolean;
  private includeTags: string[];

  constructor(options: Options) {
    this.grep = options.grep;
    this.invertGrep = options.invertGrep || false;
    this.excludeTags = options.excludeTags || [];
    this.exclusive = options.exclusive || false;
    this.includeTags = options.includeTags || [];
  }

  /**
   * `match()` does blacklist/whitelist matching of tasks to determine if they
   * should be run. It should be called with each task, depth first. When `true`
   * is returned the task should be kept, when `false` is returned the task
   * should be discarded, and when a new `Matcher` is returned that matcher
   * should be used for all tasks within the matched task.
   *
   * Blacklist matching is always enabled. It is used to match tasks using
   * `.skip()` or matching the `excludeTags`. Blacklisted tests/suites are
   * completely excluded and `match()` will always return `false` for any
   * blacklisted task.
   *
   * Whitelist matching is enabled by these situations because we only want
   * to run specific tasks, but it's a little more complicated because whitelisted
   * tasks can be anywhere in the tree:
   *  - any task using `.only()`
   *  - passing the `grep` or `includeTags` options
   *
   * @param task
   */
  public match(
    task: TaskDefinition
  ): { match: boolean; excluded: boolean; childMatcher?: Matcher } {
    const excluded = this.hasExcludeTags(task);
    if (task.skip || excluded) {
      return {
        match: false,
        excluded,
      };
    }

    if (!this.isWhitelistEnabled()) {
      return {
        match: true,
        excluded: false,
      };
    }

    const matchesWhiteList =
      this.hasIncludeTags(task) || this.isExclusive(task) || this.matchesGrep(task);

    if (task instanceof SuiteDefinition) {
      if (!matchesWhiteList) {
        /**
         * When a suite does not match the whitelist we return `true` because
         * the suite might have additional tasks inside it that match, which
         * need to be checked. The consumer of the matcher is responsible
         * for discarding the suite if none of its tasks match.
         */
        return {
          match: true,
          excluded: true,
        };
      }

      /**
       * When a suite *does* match the whitelist we return an alternate matcher
       * which has the whitelist options removed, which the consumer of the
       * matcher must use to test tasks inside that suite.
       */
      return {
        match: true,
        excluded: false,
        childMatcher: new Matcher({
          excludeTags: this.excludeTags,
          grep: this.grep,
          invertGrep: this.invertGrep,
          exclusive: false,
          includeTags: [],
        }),
      };
    }

    return {
      match: matchesWhiteList,
      excluded: !matchesWhiteList,
    };
  }

  private hasExcludeTags(task: TaskDefinition) {
    return this.excludeTags.length > 0 && shareAnyItem(this.excludeTags, task.tags);
  }

  private isWhitelistEnabled() {
    return this.includeTags.length > 0 || this.exclusive || !!this.grep;
  }

  private hasIncludeTags(task: TaskDefinition) {
    return this.includeTags.length > 0 && shareAnyItem(this.includeTags, task.tags);
  }

  private isExclusive(task: TaskDefinition) {
    return this.exclusive && task.exclusive;
  }

  private matchesGrep(task: TaskDefinition) {
    if (!this.grep) {
      return false;
    }

    if (task instanceof SuiteDefinition) {
      return true;
    }

    return getFullName(task).includes(this.grep) !== this.invertGrep;
  }
}
