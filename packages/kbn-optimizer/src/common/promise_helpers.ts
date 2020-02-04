/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as Rx from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import { maybe } from './rxjs_helpers';

/**
 * Concurrently iterate over an array of items, resolving the promises returned from each call to fn,
 * limit concurrency, items are sorted in resolution order so be sure to sort after the fact.
 */
export const concurrentMap = async <T1, T2>(
  array: Iterable<T1>,
  fn: (item: T1) => Promise<T2 | undefined>,
  concurrency = 100
) =>
  await Rx.from(array)
    .pipe(
      mergeMap(async item => await fn(item), concurrency),
      maybe(),
      toArray()
    )
    .toPromise();
