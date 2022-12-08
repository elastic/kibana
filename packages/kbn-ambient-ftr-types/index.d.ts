/* eslint-disable @kbn/eslint/require-license-header */
/* eslint-disable @typescript-eslint/unified-signatures */

/**
 * @notice
 *
 * These types are extracted from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/bb83a9839cb23195f3f0ac5a0ec61af879f194e9/types/mocha
 * and modified for use in the Kibana repository.
 *
 * This project is licensed under the MIT license.
 *
 * Copyrights are respective of each contributor listed at the beginning of each definition file.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

declare namespace Mocha {
  /**
   * Test context
   *
   * @see https://mochajs.org/api/module-Context.html#~Context
   */
  interface Context {
    /**
     * Get test timeout.
     */
    timeout(): number;

    /**
     * Set test timeout.
     */
    timeout(ms: string | number): this;

    /**
     * Get test slowness threshold.
     */
    slow(): number;

    /**
     * Set test slowness threshold.
     */
    slow(ms: string | number): this;

    /**
     * Mark a test as skipped.
     */
    skip(): never;

    /**
     * Get the number of allowed retries on failed tests.
     */
    retries(): number;

    /**
     * Set the number of allowed retries on failed tests.
     */
    retries(n: number): this;

    [key: string]: any;
  }

  type Done = (err?: any) => void;

  /**
   * Callback function used for tests and hooks.
   */
  type Func = (this: Context, done: Done) => void;

  /**
   * Async callback function used for tests and hooks.
   */
  type AsyncFunc = (this: Context) => PromiseLike<any>;

  interface Suite {
    /**
     * Get timeout `ms`.
     *
     * @see https://mochajs.org/api/Mocha.Suite.html#timeout
     */
    timeout(): number;

    /**
     * Set timeout `ms` or short-hand such as "2s".
     *
     * @see https://mochajs.org/api/Mocha.Suite.html#timeout
     */
    timeout(ms: string | number): this;

    /**
     * Get number of times to retry a failed test.
     *
     * @see https://mochajs.org/api/Mocha.Suite.html#retries
     */
    retries(): number;

    /**
     * Set number of times to retry a failed test.
     *
     * @see https://mochajs.org/api/Mocha.Suite.html#retries
     */
    retries(n: string | number): this;

    /**
     * Get slow `ms`.
     *
     * @see https://mochajs.org/api/Mocha.Suite.html#slow
     */
    slow(): number;

    /**
     * Set slow `ms` or short-hand such as "2s".
     *
     * @see https://mochajs.org/api/Mocha.Suite.html#slow
     */
    slow(ms: string | number): this;

    /**
     * Get whether to bail after first error.
     *
     * @see https://mochajs.org/api/Mocha.Suite.html#bail
     */
    bail(): boolean;

    /**
     * Set whether to bail after first error.
     *
     * @see https://mochajs.org/api/Mocha.Suite.html#bail
     */
    bail(bail: boolean): this;

    /**
     * Set tags for this suite.
     */
    tags(tags: string | string[]): void;

    /**
     * Limit the compatible ES versions for this suite. If FTR is started
     * with an incompatible version of ES then this suite will be automatically
     * skipped.
     */
    onlyEsVersion(semver: string | string[]): void;
  }

  interface HookFunction {
    /**
     * [bdd, qunit, tdd] Describe a "hook" to execute the given callback `fn`. The name of the
     * function is used as the name of the hook.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (fn: Func): void;

    /**
     * [bdd, qunit, tdd] Describe a "hook" to execute the given callback `fn`. The name of the
     * function is used as the name of the hook.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (fn: AsyncFunc): void;

    /**
     * [bdd, qunit, tdd] Describe a "hook" to execute the given `title` and callback `fn`.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (name: string, fn?: Func): void;

    /**
     * [bdd, qunit, tdd] Describe a "hook" to execute the given `title` and callback `fn`.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (name: string, fn?: AsyncFunc): void;
  }

  interface SuiteFunction {
    /**
     * [bdd, tdd] Describe a "suite" with the given `title` and callback `fn` containing
     * nested suites.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (title: string, fn: (this: Suite) => void): Suite;

    /**
     * [qunit] Describe a "suite" with the given `title`.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (title: string): Suite;

    /**
     * [bdd, tdd, qunit] Indicates this suite should be executed exclusively.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    only: ExclusiveSuiteFunction;

    /**
     * [bdd, tdd] Indicates this suite should not be executed.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    skip: PendingSuiteFunction;
  }

  interface ExclusiveSuiteFunction {
    /**
     * [bdd, tdd] Describe a "suite" with the given `title` and callback `fn` containing
     * nested suites. Indicates this suite should be executed exclusively.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (title: string, fn: (this: Suite) => void): Suite;

    /**
     * [qunit] Describe a "suite" with the given `title`. Indicates this suite should be executed
     * exclusively.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (title: string): Suite;
  }

  /**
   * [bdd, tdd] Describe a "suite" with the given `title` and callback `fn` containing
   * nested suites. Indicates this suite should not be executed.
   *
   * - _Only available when invoked via the mocha CLI._
   *
   * @returns [bdd] `Suite`
   * @returns [tdd] `void`
   */
  type PendingSuiteFunction = (title: string, fn: (this: Suite) => void) => Suite | void;

  interface TestFunction {
    /**
     * Describe a specification or test-case with the given callback `fn` acting as a thunk.
     * The name of the function is used as the name of the test.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (fn: Func): Test;

    /**
     * Describe a specification or test-case with the given callback `fn` acting as a thunk.
     * The name of the function is used as the name of the test.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (fn: AsyncFunc): Test;

    /**
     * Describe a specification or test-case with the given `title` and callback `fn` acting
     * as a thunk.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (title: string, fn?: Func): Test;

    /**
     * Describe a specification or test-case with the given `title` and callback `fn` acting
     * as a thunk.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (title: string, fn?: AsyncFunc): Test;

    /**
     * Indicates this test should be executed exclusively.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    only: ExclusiveTestFunction;

    /**
     * Indicates this test should not be executed.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    skip: PendingTestFunction;

    /**
     * Number of attempts to retry.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    retries(n: number): void;
  }

  interface ExclusiveTestFunction {
    /**
     * [bdd, tdd, qunit] Describe a specification or test-case with the given callback `fn`
     * acting as a thunk. The name of the function is used as the name of the test. Indicates
     * this test should be executed exclusively.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (fn: Func): Test;

    /**
     * [bdd, tdd, qunit] Describe a specification or test-case with the given callback `fn`
     * acting as a thunk. The name of the function is used as the name of the test. Indicates
     * this test should be executed exclusively.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (fn: AsyncFunc): Test;

    /**
     * [bdd, tdd, qunit] Describe a specification or test-case with the given `title` and
     * callback `fn` acting as a thunk. Indicates this test should be executed exclusively.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (title: string, fn?: Func): Test;

    /**
     * [bdd, tdd, qunit] Describe a specification or test-case with the given `title` and
     * callback `fn` acting as a thunk. Indicates this test should be executed exclusively.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (title: string, fn?: AsyncFunc): Test;
  }

  interface PendingTestFunction {
    /**
     * [bdd, tdd, qunit] Describe a specification or test-case with the given callback `fn`
     * acting as a thunk. The name of the function is used as the name of the test. Indicates
     * this test should not be executed.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (fn: Func): Test;

    /**
     * [bdd, tdd, qunit] Describe a specification or test-case with the given callback `fn`
     * acting as a thunk. The name of the function is used as the name of the test. Indicates
     * this test should not be executed.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (fn: AsyncFunc): Test;

    /**
     * [bdd, tdd, qunit] Describe a specification or test-case with the given `title` and
     * callback `fn` acting as a thunk. Indicates this test should not be executed.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (title: string, fn?: Func): Test;

    /**
     * [bdd, tdd, qunit] Describe a specification or test-case with the given `title` and
     * callback `fn` acting as a thunk. Indicates this test should not be executed.
     *
     * - _Only available when invoked via the mocha CLI._
     */
    (title: string, fn?: AsyncFunc): Test;
  }

  /**
   * Execute after each test case.
   *
   * - _Only available when invoked via the mocha CLI._
   *
   * @see https://mochajs.org/api/global.html#afterEach
   */
  let afterEach: HookFunction;

  /**
   * Execute after running tests.
   *
   * - _Only available when invoked via the mocha CLI._
   *
   * @see https://mochajs.org/api/global.html#after
   */
  let after: HookFunction;

  /**
   * Execute before each test case.
   *
   * - _Only available when invoked via the mocha CLI._
   *
   * @see https://mochajs.org/api/global.html#beforeEach
   */
  let beforeEach: HookFunction;

  /**
   * Execute before running tests.
   *
   * - _Only available when invoked via the mocha CLI._
   *
   * @see https://mochajs.org/api/global.html#before
   */
  let before: HookFunction;

  /**
   * Describe a "suite" containing nested suites and tests.
   *
   * - _Only available when invoked via the mocha CLI._
   */
  let describe: SuiteFunction;

  /**
   * Describe a pending suite.
   *
   * - _Only available when invoked via the mocha CLI._
   */
  let xdescribe: PendingSuiteFunction;

  /**
   * Describes a test case.
   *
   * - _Only available when invoked via the mocha CLI._
   */
  let it: TestFunction;

  /**
   * Describes a pending test case.
   *
   * - _Only available when invoked via the mocha CLI._
   */
  let xit: PendingTestFunction;

  /**
   * Execute before each test case.
   *
   * - _Only available when invoked via the mocha CLI._
   *
   * @see https://mochajs.org/api/global.html#beforeEach
   */
  let setup: HookFunction;

  /**
   * Execute before running tests.
   *
   * - _Only available when invoked via the mocha CLI._
   *
   * @see https://mochajs.org/api/global.html#before
   */
  let suiteSetup: HookFunction;

  /**
   * Execute after running tests.
   *
   * - _Only available when invoked via the mocha CLI._
   *
   * @see https://mochajs.org/api/global.html#after
   */
  let suiteTeardown: HookFunction;

  /**
   * Describe a "suite" containing nested suites and tests.
   *
   * - _Only available when invoked via the mocha CLI._
   */
  let suite: SuiteFunction;

  /**
   * Execute after each test case.
   *
   * - _Only available when invoked via the mocha CLI._
   *
   * @see https://mochajs.org/api/global.html#afterEach
   */
  let teardown: HookFunction;

  /**
   * Describes a test case.
   *
   * - _Only available when invoked via the mocha CLI._
   */
  let test: TestFunction;
}

/**
 * Execute before running tests.
 *
 * - _Only available when invoked via the mocha CLI._
 *
 * @see https://mochajs.org/api/global.html#before
 */
declare let before: Mocha.HookFunction;

/**
 * Execute before running tests.
 *
 * - _Only available when invoked via the mocha CLI._
 *
 * @see https://mochajs.org/api/global.html#before
 */
declare let suiteSetup: Mocha.HookFunction;

/**
 * Execute after running tests.
 *
 * - _Only available when invoked via the mocha CLI._
 *
 * @see https://mochajs.org/api/global.html#after
 */
declare let after: Mocha.HookFunction;

/**
 * Execute after running tests.
 *
 * - _Only available when invoked via the mocha CLI._
 *
 * @see https://mochajs.org/api/global.html#after
 */
declare let suiteTeardown: Mocha.HookFunction;

/**
 * Execute before each test case.
 *
 * - _Only available when invoked via the mocha CLI._
 *
 * @see https://mochajs.org/api/global.html#beforeEach
 */
declare let beforeEach: Mocha.HookFunction;

/**
 * Execute before each test case.
 *
 * - _Only available when invoked via the mocha CLI._
 *
 * @see https://mochajs.org/api/global.html#beforeEach
 */
declare let setup: Mocha.HookFunction;

/**
 * Execute after each test case.
 *
 * - _Only available when invoked via the mocha CLI._
 *
 * @see https://mochajs.org/api/global.html#afterEach
 */
declare let afterEach: Mocha.HookFunction;

/**
 * Execute after each test case.
 *
 * - _Only available when invoked via the mocha CLI._
 *
 * @see https://mochajs.org/api/global.html#afterEach
 */
declare let teardown: Mocha.HookFunction;

/**
 * Describe a "suite" containing nested suites and tests.
 *
 * - _Only available when invoked via the mocha CLI._
 */
declare let describe: Mocha.SuiteFunction;

/**
 * Describe a "suite" containing nested suites and tests.
 *
 * - _Only available when invoked via the mocha CLI._
 */
declare let context: Mocha.SuiteFunction;

/**
 * Describe a "suite" containing nested suites and tests.
 *
 * - _Only available when invoked via the mocha CLI._
 */
declare let suite: Mocha.SuiteFunction;

/**
 * Pending suite.
 *
 * - _Only available when invoked via the mocha CLI._
 */
declare let xdescribe: Mocha.PendingSuiteFunction;

/**
 * Pending suite.
 *
 * - _Only available when invoked via the mocha CLI._
 */
declare let xcontext: Mocha.PendingSuiteFunction;

/**
 * Describes a test case.
 *
 * - _Only available when invoked via the mocha CLI._
 */
declare let it: Mocha.TestFunction;

/**
 * Describes a test case.
 *
 * - _Only available when invoked via the mocha CLI._
 */
declare let specify: Mocha.TestFunction;

/**
 * Describes a test case.
 *
 * - _Only available when invoked via the mocha CLI._
 */
declare let test: Mocha.TestFunction;

/**
 * Describes a pending test case.
 *
 * - _Only available when invoked via the mocha CLI._
 */
declare let xit: Mocha.PendingTestFunction;

/**
 * Describes a pending test case.
 *
 * - _Only available when invoked via the mocha CLI._
 */
declare let xspecify: Mocha.PendingTestFunction;
