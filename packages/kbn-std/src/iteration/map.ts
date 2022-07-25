/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from, lastValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';

import { IterableInput, AsyncMapFn, AsyncMapResult } from './types';
import { mapWithLimit$ } from './observable';

const getAllResults = <T>(input: AsyncMapResult<T>) => lastValueFrom(from(input).pipe(toArray()));

/**
 * Creates a promise whose values is the array of results produced by calling `fn` for
 * each item in `iterable`. `fn` can return either a Promise or Observable. If `fn`
 * returns observables then they will properly abort if an error occurs.
 *
 * The result array follows the order of the input iterable, even though the calls
 * to `fn` may not. (so avoid side effects)
 *
 * @param iterable Items to iterate
 * @param fn Function to call for each item. Result is added/concatenated into the result array in place of the input value
 */
export async function asyncMap<T1, T2>(iterable: IterableInput<T1>, fn: AsyncMapFn<T1, T2>) {
  return await asyncMapWithLimit(iterable, Infinity, fn);
}

/**
 * Creates a promise whose values is the array of results produced by calling `fn` for
 * each item in `iterable`. `fn` can return either a Promise or Observable. If `fn`
 * returns observables then they will properly abort if an error occurs.
 *
 * The number of concurrent executions of `fn` is limited by `limit`.
 *
 * The result array follows the order of the input iterable, even though the calls
 * to `fn` may not. (so avoid side effects)
 *
 * @param iterable Items to iterate
 * @param limit Maximum number of operations to run in parallel
 * @param fn Function to call for each item. Result is added/concatenated into the result array in place of the input value
 */
export async function asyncMapWithLimit<T1, T2>(
  iterable: IterableInput<T1>,
  limit: number,
  fn: AsyncMapFn<T1, T2>
) {
  const results$ = mapWithLimit$(
    iterable,
    limit,
    async (item, i) => [i, await getAllResults(fn(item, i))] as const
  );

  const results = await getAllResults(results$);

  return results
    .sort(([a], [b]) => a - b)
    .reduce((acc: T2[], [, result]) => acc.concat(result), []);
}
