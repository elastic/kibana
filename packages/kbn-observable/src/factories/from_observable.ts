import symbolObservable from 'symbol-observable';
import { Observable, Subscribable } from '../observable';

// We have to use the `Symbol.observable` that is made available by the polyfill
// above when creating the `ObservableLike` type, as we can't rely on
// `symbolObservable` (TypeScript complains that it's not a `unique symbol`).
// However, that makes `$fromObservable` a bit difficult to work with as we
// can't otherwise rely on `Symbol.observable` in the code itself, since not all
// environments have `Symbol` available, e.g. IE11.
export type ObservableLike<T> = {
  [Symbol.observable]: () => Subscribable<T>;
};

/**
 * Create a `@kbn/observable` Observable from any object that implements
 * the `Symbol.observable` interop method.
 *
 * Examples of similar functionality in other Observable libs:
 *
 * - RxJS: Observable.from(anyObservableImpl)
 * - Bacon: Bacon.fromESObservable(anyObservableImpl)
 * - Kefir: Kefir.fromESObservable(anyObservableImpl)
 *
 * NB! Why is `Subscribable` in the input type? It's mostly described in the
 * `ObservableLike` comment above. The problem comes down to handling the
 * `Symbol.observable` properly. Ideally this function should only accept
 * `ObservableLike<T>` while still working without errors with both RxJS
 * Observables and Kbn Observables. However, to be pragmatic `Subscribable<T>`
 * is currently included here to simplify the use of `$fromObservable`.
 */
export function $fromObservable<T>(
  x: ObservableLike<T> | Subscribable<T>
): Observable<T> {
  if (x == null) {
    throw new TypeError(`${x} is not an object`);
  }

  // This is required because of the Symbol.observable problems described above.
  const obj = x as any;

  if (!obj[symbolObservable]) {
    throw new TypeError(
      `The input does not contain a Symbol.observable method, received [${typeof obj}]`
    );
  }

  const observable = obj[symbolObservable]();

  if (typeof observable !== 'object') {
    throw new TypeError(
      `The returned value is not an object which is required to correctly implement Symbol.observable, received [${typeof observable}]`
    );
  }

  if (typeof observable.subscribe !== 'function') {
    throw new TypeError(
      `The returned value does not contain a 'subscribe' function which is required to correctly implement Symbol.observable, received [${typeof observable.subscribe}]`
    );
  }

  if (observable.constructor === Observable) {
    return observable as Observable<T>;
  }

  return new Observable<T>(observer => observable.subscribe(observer));
}
