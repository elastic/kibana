/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const expectErrorAsync = (fn: (...args: unknown[]) => Promise<unknown>): Promise<Error> => {
  return fn()
    .then(() => {
      throw new Error('Expected an error throw.');
    })
    .catch((error) => {
      if (error.message === 'Expected an error throw.') {
        throw error;
      }
      return error;
    });
};

export const expectError = (fn: (...args: any) => any): Error => {
  try {
    fn();
    throw new Error('Expected an error throw.');
  } catch (error) {
    if (error.message === 'Expected an error throw.') {
      throw error;
    }
    return error;
  }
};

export const of = async <T, P extends Promise<T>>(
  promise: P
): Promise<[T | undefined, Error | any]> => {
  try {
    return [await promise, undefined];
  } catch (error) {
    return [, error];
  }
};
