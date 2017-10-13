import { Observable, Subscription } from '../Observable';
import { OperatorFunction } from '../interfaces';

/**
 * Projects each source value to an Observable which is merged in the output
 * Observable, emitting values only from the most recently projected Observable.
 * 
 * To understand how `switchMap` works, take a look at:
 * https://medium.com/@w.dave.w/becoming-more-reactive-with-rxjs-flatmap-and-switchmap-ccd3fb7b67fa
 * 
 * It's kinda like a normal `flatMap`, except it's producing observables and you
 * _only_ care about the latest observable it produced. One use-case for
 * `switchMap` is if need to control what happens both when you create and when
 * you're done with an observable, like in the example below where we want to
 * write the pid file when we receive a pid config, and delete it when we
 * receive new config values (or when we stop the pid service).
 * 
 * ```js
 * .switchMap(config => {
 *   return new Observable(() => {
 *     const pid = new PidFile(config);
 *     pid.writeFile();
 *
 *     // Whenever a new observable is returned, `switchMap` will unsubscribe
 *     // from the previous observable. That means that we can e.g. run teardown
 *     // logic in the unsubscribe.
 *     return function unsubscribe() {
 *       pid.deleteFile();
 *     };
 *   });
 * });
 * ```
 * 
 * Another example could be emitting a value X seconds after receiving it from
 * the source observable, but cancelling if another value is received before the
 * timeout, e.g.
 * 
 * ```js
 * .switchMap(value => {
 *   return new Observable(observer => {
 *     const id = setTimeout(() => {
 *       observer.next(value);
 *     }, 5000);
 *
 *     return function unsubscribe() {
 *       clearTimeout(id);
 *     };
 *   });
 * });
 * ```
 */
export function switchMap<T, R>(
  project: (value: T, index: number) => Observable<R>
): OperatorFunction<T, R> {
  return function switchMapOperation(source) {
    return new Observable(observer => {
      let i = 0;
      let innerSubscription: Subscription | undefined = undefined;

      return source.subscribe({
        next(value) {
          let result;
          try {
            result = project(value, i++);
          } catch (error) {
            observer.error(error);
            return;
          }

          if (innerSubscription !== undefined) {
            innerSubscription.unsubscribe();
          }

          innerSubscription = result.subscribe({
            next(innerVal) {
              observer.next(innerVal);
            },
            error(err) {
              observer.error(err);
            }
          });
        },
        error(err) {
          if (innerSubscription !== undefined) {
            innerSubscription.unsubscribe();
            innerSubscription = undefined;
          }

          observer.error(err);
        },
        complete() {
          if (innerSubscription !== undefined) {
            innerSubscription.unsubscribe();
            innerSubscription = undefined;
          }

          observer.complete();
        }
      });
    });
  };
}
