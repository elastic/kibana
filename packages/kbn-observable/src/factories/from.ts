import { Observable, ObservableInput } from '../Observable';

/**
 * Alias for `Observable.from`
 *
 * If you need to handle:
 *
 * - promises, use `$fromPromise`
 * - functions, use `$fromCallback`
 */
export function $from<T>(x: ObservableInput<T>): Observable<T> {
  return Observable.from(x);
}
