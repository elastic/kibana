/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { range } from 'lodash';
import { SignalIterable } from '../streaming/signal_iterable';
import { Fields } from '../../dsl/fields';
import { Signal } from '../../dsl/signal';

export function merge<TField extends Fields>(
  iterables: Array<SignalIterable<TField>>
): Iterable<Signal<TField>> {
  if (iterables.length === 1) return iterables[0];

  const iterators = iterables.map<{ it: Iterator<Signal<TField>>; weight: number }>((i) => {
    return { it: i[Symbol.iterator](), weight: Math.max(1, i.estimatedRatePerMinute()) };
  });
  let done = false;
  const myIterable: Iterable<Signal<TField>> = {
    *[Symbol.iterator]() {
      do {
        const items = iterators.flatMap((i) => range(0, i.weight).map(() => i.it.next()));
        done = items.every((item) => item.done);
        if (!done) {
          yield* items.filter((i) => !i.done).map((i) => i.value);
        }
      } while (!done);
      // Done for the first time: close all iterators
      for (const iterator of iterators) {
        if (typeof iterator.it.return === 'function') {
          iterator.it.return();
        }
      }
    },
  };
  return myIterable;
}
