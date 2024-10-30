/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface MemoizedCall {
  args: any[];
  returnValue: any;
  this: any;
}

// A symbol expressing, that the memoized function has never been called
const neverCalled: unique symbol = Symbol();
type NeverCalled = typeof neverCalled;

/**
 * A simple memoize function, that only stores the last returned value
 * and uses the identity of all passed parameters as a cache key.
 */
function memoizeLast<T extends (...args: any[]) => any>(func: T): T {
  let prevCall: MemoizedCall | NeverCalled = neverCalled;

  // We need to use a `function` here for proper this passing.
  const memoizedFunction = function (this: any, ...args: any[]) {
    if (
      prevCall !== neverCalled &&
      prevCall.this === this &&
      prevCall.args.length === args.length &&
      prevCall.args.every((arg, index) => arg === args[index])
    ) {
      return prevCall.returnValue;
    }

    prevCall = {
      args,
      this: this,
      returnValue: func.apply(this, args),
    };

    return prevCall.returnValue;
  } as T;

  return memoizedFunction;
}

export { memoizeLast };
