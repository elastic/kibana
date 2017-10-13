import { Observable } from '../Observable';

/**
 * Create an observable that mirrors a promise. If the promise resolves the
 * observable will emit the resolved value and then complete. If it rejects then
 * the observable will error.
 *
 * @param {Promise<T>}
 * @return {Observable<T>}
 */
export function $fromPromise<T>(promise: Promise<T>): Observable<T> {
  return new Observable(observer => {
    promise.then(
      value => {
        observer.next(value);
        observer.complete();
      },
      error => {
        observer.error(error);
      }
    );
  });
}
