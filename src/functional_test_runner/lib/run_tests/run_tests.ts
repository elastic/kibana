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

import { ToolingLog } from '@kbn/dev-utils';

// @ts-ignore
import humanizeDuration from 'humanize-duration';

import { Lifecycle } from '../lifecycle';
import { Hook, Suite, Test } from '../test_loader';

export async function runTests(log: ToolingLog, rootSuite: Suite, lifecycle: Lifecycle) {
  async function runSuite(suite: Suite) {
    const startTime = Date.now();

    if (suite.name) {
      log.info('>', suite.name);
      log.indent(4);
    }

    try {
      await lifecycle.trigger('beforeTestSuite');

      for (const hook of suite.ittrOwnHooks('before')) {
        await hook.fn();
      }

      for (const task of suite.tasks) {
        if (task instanceof Suite) {
          await runSuite(task);
        }

        if (task instanceof Test) {
          await runTest(task);
        }
      }

      for (const hook of suite.ittrOwnHooks('after')) {
        await hook.fn();
      }

      await lifecycle.trigger('afterTestSuite');
    } finally {
      if (suite.name) {
        log.debug('$$$', suite.name, '|', Date.now() - startTime + 'ms');
        log.indent(-4);
      }
    }
  }

  async function runTest(test: Test) {
    log.info('+', test.name);
    log.indent(4);

    try {
      for (const hook of test.ittrHooks('beforeEach')) {
        await runHook(hook);
      }

      await lifecycle.trigger('beforeEachTest', test);
      try {
        await test.fn();
      } catch (error) {
        await lifecycle.trigger('testFailure', error, test);
        throw error;
      }

      for (const hook of test.ittrHooks('afterEach')) {
        await runHook(hook);
      }

      log.success();
    } catch (error) {
      log.error(error);
    } finally {
      log.indent(-4);
    }
  }

  async function runHook(hook: Hook) {
    try {
      await hook.fn();
    } catch (error) {
      await lifecycle.trigger('testHookFailure', error, test);
      throw error;
    }
  }

  log.info('Starting tests');
  try {
    await lifecycle.trigger('beforeTests');
    await runSuite(rootSuite);
  } finally {
    await lifecycle.trigger('cleanup');
  }
}
