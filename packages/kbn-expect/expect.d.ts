/* eslint-disable */

// Type definitions for expect.js 0.3.1
// Project: https://github.com/Automattic/expect.js
// Definitions by: Teppei Sato <https://github.com/teppeis>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// License: MIT

export default function expect(target?: any): Root;

interface Assertion {
  /**
   * Assert typeof / instanceof.
   */
  an: An;
  /**
   * Check if the value is truthy
   */
  ok(): void;

  /**
   * Creates an anonymous function which calls fn with arguments.
   */
  withArgs(...args: any[]): Root;

  /**
   * Assert that the function throws.
   *
   * @param fn callback to match error string against
   */
  throwError(fn?: (exception: any) => void): void;

  /**
   * Assert that the function throws.
   *
   * @param fn callback to match error string against
   */
  throwException(fn?: (exception: any) => void): void;

  /**
   * Assert that the function throws.
   *
   * @param regexp regexp to match error string against
   */
  throwError(regexp: RegExp): void;

  /**
   * Assert that the function throws.
   *
   * @param fn callback to match error string against
   */
  throwException(regexp: RegExp): void;

  /**
   * Checks if the array is empty.
   */
  empty(): Assertion;

  /**
   * Checks if the obj exactly equals another.
   */
  equal(obj: any, msg?: string): Assertion;

  /**
   * Checks if the obj sortof equals another.
   */
  eql(obj: any, msg?: string): Assertion;

  /**
   * Assert within start to finish (inclusive).
   *
   * @param start
   * @param finish
   */
  within(start: number, finish: number, msg?: string): Assertion;

  /**
   * Assert typeof.
   */
  a(type: string): Assertion;

  /**
   * Assert instanceof.
   */
  a(type: Function): Assertion;

  /**
   * Assert numeric value above n.
   */
  greaterThan(n: number, msg?: string): Assertion;

  /**
   * Assert numeric value above n.
   */
  above(n: number, msg?: string): Assertion;

  /**
   * Assert numeric value below n.
   */
  lessThan(n: number, msg?: string): Assertion;

  /**
   * Assert numeric value below n.
   */
  below(n: number, msg?: string): Assertion;

  /**
   * Assert string value matches regexp.
   *
   * @param regexp
   */
  match(regexp: RegExp, msg?: string): Assertion;

  /**
   * Assert property "length" exists and has value of n.
   *
   * @param n
   */
  length(n: number, msg?: string): Assertion;

  /**
   * Assert property name exists, with optional val.
   *
   * @param name
   * @param val
   */
  property(name: string, val?: any): Assertion;

  /**
   * Assert that string contains str.
   */
  contain(str: string, msg?: string): Assertion;
  string(str: string, msg?: string): Assertion;

  /**
   * Assert that the array contains obj.
   */
  contain(obj: any, msg?: string): Assertion;
  string(obj: any, msg?: string): Assertion;

  /**
   * Assert exact keys or inclusion of keys by using the `.own` modifier.
   */
  key(keys: string[]): Assertion;
  /**
   * Assert exact keys or inclusion of keys by using the `.own` modifier.
   */
  key(...keys: string[]): Assertion;
  /**
   * Assert exact keys or inclusion of keys by using the `.own` modifier.
   */
  keys(keys: string[]): Assertion;
  /**
   * Assert exact keys or inclusion of keys by using the `.own` modifier.
   */
  keys(...keys: string[]): Assertion;

  /**
   * Assert a failure.
   */
  fail(message?: string): Assertion;
}

interface Root extends Assertion {
  not: Not;
  to: To;
  only: Only;
  have: Have;
  be: Be;
}

interface Be extends Assertion {
  /**
   * Checks if the obj exactly equals another.
   */
  (obj: any): Assertion;

  an: An;
}

interface An extends Assertion {
  /**
   * Assert typeof.
   */
  (type: string): Assertion;

  /**
   * Assert instanceof.
   */
  (type: Function): Assertion;
}

interface Not extends NotBase {
  to: ToBase;
}

interface NotBase extends Assertion {
  be: Be;
  have: Have;
  include: Assertion;
  only: Only;
}

interface To extends ToBase {
  not: NotBase;
}

interface ToBase extends Assertion {
  be: Be;
  have: Have;
  include: Assertion;
  only: Only;
}

interface Only extends Assertion {
  have: Have;
}

interface Have extends Assertion {
  own: Assertion;
}
