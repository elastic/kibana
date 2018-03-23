import symbolObservable from 'symbol-observable';

import { Observable, Subscribable } from '../observable';

export interface Observablelike<T> {
  [Symbol.observable](): Subscribable<T>;
}

export type ObservableInput<T> = Observablelike<T> | Subscribable<T>;

/**
 * If you need to handle:
 *
 * - promises, use `$fromPromise`
 * - iterables, use `$fromIterable`
 */
export function $fromObservable<T>(x: ObservableInput<T>): Observable<T> {
  if (x == null) {
    throw new TypeError(`${x} is not an object`);
  }

  // We need this as TypeScript was fighting the types below
  const obj = x as any;

  if (obj[symbolObservable]) {
    const observable = obj[symbolObservable]();

    if (typeof observable !== 'object') {
      throw new TypeError(`${observable} is not an object`);
    }

    if (typeof observable.subscribe !== 'function') {
      throw new TypeError(`${observable} is not subscribable`);
    }

    if (observable.constructor === Observable) {
      return observable;
    }

    return new Observable<T>(observer => observable.subscribe(observer));
  }

  throw new TypeError(`${x} is not observable`);
}
