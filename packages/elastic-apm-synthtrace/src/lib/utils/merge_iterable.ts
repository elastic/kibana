/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields } from '../apm/apm_fields';
import { SpanIterable } from '../span_iterable';

export function merge(iterables: SpanIterable[]): Iterable<ApmFields> {
  if (iterables.length === 1) return iterables[0];

  const iterators = iterables.map<Iterator<ApmFields>>((i) => {
    return i[Symbol.iterator]();
  });
  let done = false;
  const myIterable: Iterable<ApmFields> = {
    *[Symbol.iterator]() {
      do {
        const items = iterators.map((i) => i.next());
        done = items.every((item) => item.done);
        if (!done) {
          yield* items.filter((i) => !i.done).map((i) => i.value);
        }
      } while (!done);
      // Done for the first time: close all iterators
      for (const iterator of iterators) {
        if (typeof iterator.return === 'function') {
          iterator.return();
        }
      }
    },
  };
  return myIterable;
}
