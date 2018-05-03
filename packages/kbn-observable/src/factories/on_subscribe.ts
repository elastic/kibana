import { Observable } from '../observable';

/**
 * Creates an Observable that, on subscribe, calls an Observable factory to
 * make an Observable for each new Observer. I.e. we generate an observable when
 * subscribed to instead of doing it immediately.
 *
 * Note that `$onSubscribe` creates a fresh Observable for each observer.
 *
 * There's a couple different use-cases for `$onSubscribe`. E.g. waiting until
 * the last minute (that is, until subscription time) to generate the Observable
 * can ensure that it contains the freshest data. Also, as Observables can
 * encapsulate many different types of sources and those sources don't
 * necessarily obey the Observable interface, e.g. like Promises that always
 * attempt to complete eagerly instead of waiting until someone subscribes to
 * the result.
 *
 * Example: Perform request when observable is subscribed:
 * ```
 * $onSubscribe(() => $fromPromise(window.fetch('./api/some.json')));
 * ```
 *
 * Example: Subscribe to either an Observable of a specific value or an
 * Observable of a fetch request, at random:
 * ```
 * const data$ = $onSubscribe(() => {
 *   if (Math.random() > 0.5) {
 *     return $of({ foo: true });
 *   } else {
 *     return $fromPromise(window.fetch('./api/some.json'))
 *   }
 * });
 * data$.subscribe(x => console.log(x));
 * ```
 */
export function $onSubscribe<T>(callback: () => Observable<T>): Observable<T> {
  return new Observable(observer => {
    let root$: Observable<T>;

    try {
      root$ = callback();
    } catch (e) {
      observer.error(e);
      return;
    }

    return root$.subscribe(observer);
  });
}
