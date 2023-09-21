/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { isPromise } from '@kbn/std';
import apm from 'elastic-apm-node';

export function withSpan<T>(spanName: string, fn: () => T): T | Promise<T> {
  const currentSpan = apm.currentTransaction?.startSpan(spanName);
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        (res) => {
          currentSpan?.setOutcome('success');
          currentSpan?.end();
          return res;
        },
        (err) => {
          currentSpan?.setOutcome('failure');
          currentSpan?.end();
          throw err;
        }
      );
    }
    currentSpan?.setOutcome('success');
    currentSpan?.end();
    return result;
  } catch (err) {
    currentSpan?.setOutcome('failure');
    currentSpan?.end();
    throw err;
  }
}

export function findFunctionName(fn: Function): string {
  return fn.name || 'unnamedFn()';
}
