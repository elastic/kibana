import { Observable } from '../Observable';
import { isObservable } from '../lib/isObservable';

/**
 * Creates an observable that calls the specified function with no arguments
 * when it is subscribed. The observerable will behave differently based on the
 * return value of the factory:
 *
 * - return `undefined`: observable will immediately complete
 * - returns observable: observerable will mirror the returned value
 * - otherwise: observable will emit the value and then complete
 *
 * @param {Function}
 * @returns {Observable}
 */
export function $fromCallback<T>(
  factory: () => T | Observable<T>
): Observable<T> {
  return new Observable(observer => {
    const result = factory();

    if (result === undefined) {
      observer.complete();
    } else if (isObservable(result)) {
      return result.subscribe(observer);
    } else {
      observer.next(result);
      observer.complete();
    }
  });
}
