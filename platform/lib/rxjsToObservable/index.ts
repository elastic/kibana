import { Observable as RxjsObservable } from 'rxjs';
import { Observable } from 'kbn-observable';

/**
 * Transforms an RxJS observable into a "spec-compliant" observable.
 * (See https://github.com/tc39/proposal-observable)
 *
 * This should not be used internally in the platform, but is intended to
 * transform observables in "leaf nodes", before we hand over to plugins. This
 * ensures that plugins don't need to depend on RxJS, and we're free to update
 * that dependency or change how we handle observables internally.
 *
 * As the Observables spec defines a `Symbol.observable`, which we include in
 * `kbn-observable`, the observables we create here can be used in most other
 * observable libraries, e.g.
 *
 * - using RxJS: Observable.from(someKibanaObservable)
 * - using Bacon: Bacon.fromESObservable(someKibanaObservable)
 * - using Kefir: Kefir.fromESObservable(someKibanaObservable)
 */
export function rxjsToEsObservable<T>(observable: RxjsObservable<T>) {
  return new Observable<T>(observer =>
    observable.subscribe({
      next: val => {
        observer.next(val);
      },
      error: err => {
        observer.error(err);
      },
      complete: () => {
        observer.complete();
      }
    })
  );
}
