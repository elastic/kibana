/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Given a promise awaits it and returns a 3-tuple, with the following members:
 *
 * - First entry is either the resolved value of the promise or `undefined`.
 * - Second entry is either the error thrown by promise or `undefined`.
 * - Third entry is a boolean, truthy if promise was resolved and falsy if rejected.
 *
 * @param promise Promise to convert to 3-tuple.
 */

export const of = async <T, E = any>(
  promise: Promise<T>
): Promise<[T | undefined, E | undefined, boolean]> => {
  try {
    return [await promise, undefined, true];
  } catch (error) {
    return [undefined, error, false];
  }
};
