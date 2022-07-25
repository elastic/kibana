/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { mergeMap, toArray, map } from 'rxjs/operators';

export async function concurrentMap<T, T2>(
  concurrency: number,
  arr: T[],
  fn: (item: T, i: number) => Promise<T2>
): Promise<T2[]> {
  if (!arr.length) {
    return [];
  }

  return await Rx.lastValueFrom(
    Rx.from(arr).pipe(
      // execute items in parallel based on concurrency
      mergeMap(async (item, index) => ({ index, result: await fn(item, index) }), concurrency),
      // collect the results into an array
      toArray(),
      // sort items back into order and return array of just results
      map((list) => list.sort((a, b) => a.index - b.index).map(({ result }) => result))
    )
  );
}
