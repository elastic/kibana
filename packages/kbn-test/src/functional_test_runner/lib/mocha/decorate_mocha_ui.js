/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { relative } from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { createAssignmentProxy } from './assignment_proxy';
import { wrapFunction } from './wrap_function';
import { wrapRunnableArgs } from './wrap_runnable_args';

function split(arr, fn) {
  const a = [];
  const b = [];
  for (const i of arr) {
    (fn(i) ? a : b).push(i);
  }
  return [a, b];
}

export function decorateMochaUi(log, lifecycle, context, { isDockerGroup, rootTags }) {
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
          before('beforeTestSuite.trigger', async () => {
            await lifecycle.beforeTestSuite.trigger(this);
          });

          const relativeFilePath = relative(REPO_ROOT, this.file);
          this._tags = [
            ...(isDockerGroup ? ['ciGroupDocker', relativeFilePath] : [relativeFilePath]),
            // we attach the "root tags" to all the child suites of the root suite, so that if they
            // need to be excluded they can be removed from the root suite without removing the entire
            // root suite
            ...(this.parent.root ? [...(rootTags ?? [])] : []),
          ];
          this.suiteTag = relativeFilePath; // The tag that uniquely targets this suite/file
          this.tags = (tags) => {
            const newTags = Array.isArray(tags) ? tags : [tags];
            const [tagsToAdd, tagsToIgnore] = split(newTags, (t) =>
              !isDockerGroup ? true : !t.startsWith('ciGroup')
            );

            if (tagsToIgnore.length) {
              log.warning(
                `ignoring ciGroup tags because test is being run by a config using 'dockerServers', tags: ${tagsToIgnore}`
              );
            }

            this._tags = [...this._tags, ...tagsToAdd];
          };
          this.onlyEsVersion = (semver) => {
            this._esVersionRequirement = semver;
          };

          provider.call(this);

          after('afterTestSuite.trigger', async () => {
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
