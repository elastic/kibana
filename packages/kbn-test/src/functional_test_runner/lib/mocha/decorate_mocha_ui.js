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
import { relative } from 'path';
import { REPO_ROOT } from '@kbn/dev-utils';
import { createAssignmentProxy } from './assignment_proxy';
import { wrapFunction } from './wrap_function';
import { wrapRunnableArgs } from './wrap_runnable_args';

export function decorateMochaUi(lifecycle, context) {
  // incremented at the start of each suite, decremented after
  // so that in each non-suite call we can know if we are within
  // a suite, or that when a suite is defined it is within a suite
  let suiteLevel = 0;

  // incremented at the start of each suite, used to know when a
  // suite is not the first suite
  let suiteCount = 0;

  /**
   *  Wrap the describe() function in the mocha UI to ensure
   *  that the first call made when defining a test file is a
   *  "describe()", and that there is only one describe call at
   *  the top level of that file.
   *
   *  @param  {String} name
   *  @param  {Function} fn
   *  @return {Function}
   */
  function wrapSuiteFunction(name, fn) {
    return wrapFunction(fn, {
      before(target, thisArg, argumentsList) {
        if (suiteCount > 0 && suiteLevel === 0) {
          throw new Error(`
            Test files must only define a single top-level suite. Please ensure that
            all calls to \`describe()\` are within a single \`describe()\` call in this file.
          `);
        }

        const [name, provider] = argumentsList;
        if (typeof name !== 'string' || typeof provider !== 'function') {
          throw new Error(`Unexpected arguments to ${name}(${argumentsList.join(', ')})`);
        }

        argumentsList[1] = function () {
          before(async () => {
            await lifecycle.beforeTestSuite.trigger(this);
          });

          this.tags = (tags) => {
            this._tags = [].concat(this._tags || [], tags);
          };

          const relativeFilePath = relative(REPO_ROOT, this.file);
          this.tags(relativeFilePath);
          this.suiteTag = relativeFilePath; // The tag that uniquely targets this suite/file

          provider.call(this);

          after(async () => {
            await lifecycle.afterTestSuite.trigger(this);
          });
        };

        suiteCount += 1;
        suiteLevel += 1;
      },
      after() {
        suiteLevel -= 1;
      },
    });
  }

  /**
   *  Wrap test functions to emit "testFailure" lifecycle hooks
   *  when they fail and throw when they are called outside of
   *  a describe
   *
   *  @param  {String} name
   *  @param  {Function} fn
   *  @return {Function}
   */
  function wrapTestFunction(name, fn) {
    return wrapNonSuiteFunction(
      name,
      wrapRunnableArgs(fn, lifecycle, async (err, test) => {
        await lifecycle.testFailure.trigger(err, test);
      })
    );
  }

  /**
   *  Wrap test hook functions to emit "testHookFailure" lifecycle
   *  hooks when they fail and throw when they are called outside
   *  of a describe
   *
   *  @param  {String} name
   *  @param  {Function} fn
   *  @return {Function}
   */
  function wrapTestHookFunction(name, fn) {
    return wrapNonSuiteFunction(
      name,
      wrapRunnableArgs(fn, lifecycle, async (err, test) => {
        await lifecycle.testHookFailure.trigger(err, test);
      })
    );
  }

  /**
   *  Wrap all non describe() mocha ui functions to ensure
   *  that they are not called outside of a describe block
   *
   *  @param  {String} name
   *  @param  {Function} fn
   *  @return {Function}
   */
  function wrapNonSuiteFunction(name, fn) {
    return wrapFunction(fn, {
      before() {
        if (suiteLevel === 0) {
          throw new Error(`
            All ${name}() calls in test files must be within a describe() call.
          `);
        }
      },
    });
  }

  /**
   *  called for every assignment while defining the mocha ui
   *  and can return an alternate value that will be used for that
   *  assignment
   *
   *  @param  {String} property
   *  @param  {Any} value
   *  @return {Any} replacement function
   */
  function assignmentInterceptor(property, value) {
    if (typeof value !== 'function') {
      return value;
    }

    value = createAssignmentProxy(value, (subProperty, subValue) => {
      return assignmentInterceptor(`${property}.${subProperty}`, subValue);
    });

    switch (property) {
      case 'describe':
      case 'describe.only':
      case 'describe.skip':
      case 'xdescribe':
      case 'context':
      case 'context.only':
      case 'context.skip':
      case 'xcontext':
        return wrapSuiteFunction(property, value);

      case 'it':
      case 'it.only':
      case 'it.skip':
      case 'xit':
      case 'specify':
      case 'specify.only':
      case 'specify.skip':
      case 'xspecify':
        return wrapTestFunction(property, value);

      case 'before':
      case 'beforeEach':
      case 'after':
      case 'afterEach':
      case 'run':
        return wrapTestHookFunction(property, value);

      default:
        return wrapNonSuiteFunction(property, value);
    }
  }

  return createAssignmentProxy(context, assignmentInterceptor);
}
