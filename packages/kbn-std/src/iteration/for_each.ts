/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaultIfEmpty } from 'rxjs/operators';

import { lastValueFrom } from '../rxjs_7';
import { mapWithLimit$ } from './observable';
import { IterableInput, AsyncMapFn } from './types';

/**
 * Creates a promise which resolves with `undefined` after calling `fn` for each
 * item in `iterable`. `fn` can return either a Promise or Observable. If `fn`
 * returns observables then they will properly abort if an error occurs.
 *
 * @param iterable Items to iterate
 * @param fn Function to call for each item
 */
export async function asyncForEach<T>(iterable: IterableInput<T>, fn: AsyncMapFn<T, any>) {
  await lastValueFrom(mapWithLimit$(iterable, Infinity, fn).pipe(defaultIfEmpty(undefined)));
}

/**
 * Creates a promise which resolves with `undefined` after calling `fn` for each
 * item in `iterable`. `fn` can return either a Promise or Observable. If `fn`
 * returns observables then they will properly abort if an error occurs.
 *
 * The number of concurrent executions of `fn` is limited by `limit`.
 *
 * @param iterable Items to iterate
 * @param limit Maximum number of operations to run in parallel
 * @param fn Function to call for each item
 */
export async function asyncForEachWithLimit<T>(
  iterable: IterableInput<T>,
  limit: number,
  fn: AsyncMapFn<T, any>
) {
  await lastValueFrom(mapWithLimit$(iterable, limit, fn).pipe(defaultIfEmpty(undefined)));
}
