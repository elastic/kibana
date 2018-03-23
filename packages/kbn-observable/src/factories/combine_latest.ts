import { Observable } from '../observable';

const pending = Symbol('awaiting first value');

export function $combineLatest<T, T2>(
  v1: Observable<T>,
  v2: Observable<T2>
): Observable<[T, T2]>;
export function $combineLatest<T, T2, T3>(
  v1: Observable<T>,
  v2: Observable<T2>,
  v3: Observable<T3>
): Observable<[T, T2, T3]>;
export function $combineLatest<T, T2, T3, T4>(
  v1: Observable<T>,
  v2: Observable<T2>,
  v3: Observable<T3>,
  v4: Observable<T4>
): Observable<[T, T2, T3, T4]>;
export function $combineLatest<T, T2, T3, T4, T5>(
  v1: Observable<T>,
  v2: Observable<T2>,
  v3: Observable<T3>,
  v4: Observable<T4>,
  v5: Observable<T5>
): Observable<[T, T2, T3, T4, T5]>;
export function $combineLatest<T, T2, T3, T4, T5, T6>(
  v1: Observable<T>,
  v2: Observable<T2>,
  v3: Observable<T3>,
  v4: Observable<T4>,
  v5: Observable<T5>,
  v6: Observable<T6>
): Observable<[T, T2, T3, T4, T5, T6]>;
export function $combineLatest<T>(
  ...observables: Observable<T>[]
): Observable<T[]>;

/**
 * Creates an observable that combines the values by subscribing to all
 * observables passed and emitting an array with the latest value from each
 * observable once after each observable has emitted at least once, and again
 * any time an observable emits after that.
 *
 * As `$combineLatest` depends on all input observable to emit at least once to
 * be able to emit a combined result, consumers will see no emits if any of the
 * input observables never emit.
 */
export function $combineLatest<T>(
  ...observables: Observable<T>[]
): Observable<T[]> {
  return new Observable(observer => {
    // create an array that will receive values as observables
    // update and initialize it with `pending` symbols so that
    // we know when observables emit for the first time
    const values: (symbol | T)[] = observables.map(() => pending);

    let needFirstCount = values.length;
    let activeCount = values.length;

    const subs = observables.map((observable, i) =>
      observable.subscribe({
        next(value) {
          if (values[i] === pending) {
            needFirstCount--;
          }

          values[i] = value;

          if (needFirstCount === 0) {
            observer.next(values.slice() as T[]);
          }
        },

        error(error) {
          observer.error(error);
          values.length = 0;
        },

        complete() {
          activeCount--;

          if (activeCount === 0) {
            observer.complete();
            values.length = 0;
          }
        },
      })
    );

    return function() {
      subs.forEach(sub => {
        sub.unsubscribe();
      });
      values.length = 0;
    };
  });
}
