import { Observable, ObservableInput } from '../Observable';
import { $from } from '../factories';

const pending = Symbol('awaiting first value');

export function $combineLatest<T, T2>(
  v1: ObservableInput<T>,
  v2: ObservableInput<T2>
): Observable<[T, T2]>;
export function $combineLatest<T, T2, T3>(
  v1: ObservableInput<T>,
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>
): Observable<[T, T2, T3]>;
export function $combineLatest<T, T2, T3, T4>(
  v1: ObservableInput<T>,
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>,
  v4: ObservableInput<T4>
): Observable<[T, T2, T3, T4]>;
export function $combineLatest<T, T2, T3, T4, T5>(
  v1: ObservableInput<T>,
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>,
  v4: ObservableInput<T4>,
  v5: ObservableInput<T5>
): Observable<[T, T2, T3, T4, T5]>;
export function $combineLatest<T, T2, T3, T4, T5, T6>(
  v1: ObservableInput<T>,
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>,
  v4: ObservableInput<T4>,
  v5: ObservableInput<T5>,
  v6: ObservableInput<T6>
): Observable<[T, T2, T3, T4, T5, T6]>;
export function $combineLatest<T>(
  ...observables: ObservableInput<T>[]
): Observable<T[]>;

/**
 * Creates an observable that combines the values by subscribing to all
 * observables passed and emiting an array with the latest value from each
 * observable once after each observable has emitted at least once, and again
 * any time an observable emits after that.
 *
 * @param {Observable...}
 * @return {Observable}
 */
export function $combineLatest<T>(
  ...observables: ObservableInput<T>[]
): Observable<T[]> {
  return new Observable(observer => {
    // create an array that will receive values as observables
    // update and initialize it with `pending` symbols so that
    // we know when observables emit for the first time
    const values: (symbol | T)[] = observables.map(() => pending);

    let needFirstCount = values.length;
    let activeCount = values.length;

    const subs = observables.map((observable, i) =>
      $from(observable).subscribe({
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
        },

        complete() {
          activeCount--;

          if (activeCount === 0) {
            observer.complete();
          }
        }
      })
    );

    return function() {
      subs.forEach(sub => {
        sub.unsubscribe();
      });
    };
  });
}
