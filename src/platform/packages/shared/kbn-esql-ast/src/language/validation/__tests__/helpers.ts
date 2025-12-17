/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { EditorError, ESQLMessage } from '../../../types';
import { getCallbackMocks } from '../../../__tests__/language/helpers';
import { validateQuery } from '../validation';

/**
 * Wraps a promise to ensure it is awaited. If the promise is not awaited
 * (i.e., `.then()` is not called before the next tick), the test will fail
 * with an error indicating the missing `await`.
 */
const mustBeAwaited = <T>(promise: Promise<T>, fnName: string): Promise<T> => {
  let wasAwaited = false;

  setImmediate(() => {
    if (!wasAwaited) {
      // Force Jest to fail by throwing an error
      throw new Error(
        `The promise returned by \`${fnName}()\` was not awaited. ` +
          `Add \`await\` before the call to ensure proper test execution.`
      );
    }
  });

  // Return a proxy promise that tracks if .then() was called
  return {
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
      wasAwaited = true;
      return promise.then(onfulfilled, onrejected);
    },
    catch<TResult = never>(
      onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
    ): Promise<T | TResult> {
      wasAwaited = true;
      return promise.catch(onrejected);
    },
    finally(onfinally?: (() => void) | null): Promise<T> {
      wasAwaited = true;
      return promise.finally(onfinally);
    },
    [Symbol.toStringTag]: 'MustBeAwaitedPromise',
  } as Promise<T>;
};

/** Validation test API factory, can be called at the start of each unit test. */
export type Setup = typeof setup;

/**
 * Sets up an API for ES|QL query validation testing.
 *
 * @returns API for testing validation logic.
 */
export const setup = async () => {
  const callbacks = getCallbackMocks();

  const validate = (query: string, cb: ESQLCallbacks = callbacks) => {
    return mustBeAwaited(validateQuery(query, cb), 'validate');
  };

  const assertErrors = (errors: unknown[], expectedErrors: string[], query?: string) => {
    const errorMessages: string[] = [];
    for (const error of errors) {
      if (error && typeof error === 'object') {
        const message =
          typeof (error as ESQLMessage).text === 'string'
            ? (error as ESQLMessage).text
            : typeof (error as EditorError).message === 'string'
            ? (error as EditorError).message
            : String(error);
        errorMessages.push(message);
      } else {
        errorMessages.push(String(error));
      }
    }

    try {
      expect(errorMessages.sort()).toStrictEqual(expectedErrors.sort());
    } catch (error) {
      throw Error(`${query}\n
      Received:
      '${errorMessages.sort()}'
      Expected:
      ${expectedErrors.sort()}`);
    }
  };

  const expectErrors = (
    query: string,
    expectedErrors: string[],
    expectedWarnings?: string[],
    cb: ESQLCallbacks = callbacks
  ) => {
    const promise = validateQuery(query, cb).then(({ errors, warnings }) => {
      assertErrors(errors, expectedErrors, query);
      if (expectedWarnings) {
        assertErrors(warnings, expectedWarnings, query);
      }
    });
    return mustBeAwaited(promise, 'expectErrors');
  };

  return {
    callbacks,
    validate,
    expectErrors,
  };
};
