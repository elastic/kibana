import { createAssignmentProxy } from './assignment_proxy';
import { wrapFunction } from './wrap_function';
import { wrapRunnableArgsWithErrorHandler } from './wrap_runnable_args';

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
      before() {
        if (suiteCount > 0 && suiteLevel === 0) {
          throw new Error(`
            Test files must only define a single top-level suite. Please ensure that
            all calls to \`describe()\` are within a single \`describe()\` call in this file.
          `);
        }

        suiteCount += 1;
        suiteLevel += 1;
      },
      after() {
        suiteLevel -= 1;
      }
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
    return wrapNonSuiteFunction(name, wrapRunnableArgsWithErrorHandler(fn, async (err, test) => {
      await lifecycle.trigger('testFailure', err, test);
    }));
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
    return wrapNonSuiteFunction(name, wrapRunnableArgsWithErrorHandler(fn, async (err, test) => {
      await lifecycle.trigger('testHookFailure', err, test);
    }));
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
      }
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

    switch (property) {
      case 'describe':
      case 'xdescribe':
      case 'context':
      case 'xcontext':
        return wrapSuiteFunction(property, value);

      case 'it':
      case 'xit':
      case 'specify':
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
