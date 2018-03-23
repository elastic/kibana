import { Observable } from '../observable';

/**
 * Converts a function that takes a callback parameter into a function that
 * returns an Observable.
 *
 * The input is a function `func` with some parameters, the
 * last parameter must be a callback function that `func` calls when it is
 * done.
 *
 * The output of `$bindCallback` is a function that takes the same parameters
 * as `func`, except the last one (the callback). When the output function
 * is called with arguments it will return an Observable. If function `func`
 * calls its callback with one argument the Observable will emit that value.
 * If on the other hand the callback is called with multiple values the
 * resulting Observable will emit an error.
 *
 * It is very important to remember that input function `func` is not called
 * when the output function is, but rather when the Observable returned by the
 * output function is `subscribe`d. This means if `func` makes an Ajax request
 * or performs other side-effects, those side-effects will trigger every time
 * someone subscribes to the resulting Observable, but not before.
 *
 * Results passed to the callback are emitted immediately after `func` invokes
 * the callback.
 *
 * Implementation detail:
 * This contains multiple overloads for `$bindCallback` to enable stricter
 * typing by matching each argument of the passed in `callbackFunc`. See
 * https://www.typescriptlang.org/docs/handbook/functions.html#overloads for
 * details about overloading.
 *
 * @param callbackFunc A function with a callback as the last parameter.
 * @return A function which returns the Observable that delivers the same values
 * the callback would deliver.
 */
export function $bindCallback(
  callbackFunc: (callback: () => any) => any
): () => Observable<void>;
export function $bindCallback<R>(
  callbackFunc: (callback: (result: R) => any) => any
): () => Observable<R>;
export function $bindCallback<T, R>(
  callbackFunc: (v1: T, callback: (result: R) => any) => any
): (v1: T) => Observable<R>;
export function $bindCallback<T, T2, R>(
  callbackFunc: (v1: T, v2: T2, callback: (result: R) => any) => any
): (v1: T, v2: T2) => Observable<R>;
export function $bindCallback<T, T2, T3, R>(
  callbackFunc: (v1: T, v2: T2, v3: T3, callback: (result: R) => any) => any
): (v1: T, v2: T2, v3: T3) => Observable<R>;
export function $bindCallback<T, T2, T3, T4, R>(
  callbackFunc: (
    v1: T,
    v2: T2,
    v3: T3,
    v4: T4,
    callback: (result: R) => any
  ) => any
): (v1: T, v2: T2, v3: T3, v4: T4) => Observable<R>;
export function $bindCallback<T, T2, T3, T4, T5, R>(
  callbackFunc: (
    v1: T,
    v2: T2,
    v3: T3,
    v4: T4,
    v5: T5,
    callback: (result: R) => any
  ) => any
): (v1: T, v2: T2, v3: T3, v4: T4, v5: T5) => Observable<R>;
export function $bindCallback<T, T2, T3, T4, T5, T6, R>(
  callbackFunc: (
    v1: T,
    v2: T2,
    v3: T3,
    v4: T4,
    v5: T5,
    v6: T6,
    callback: (result: R) => any
  ) => any
): (v1: T, v2: T2, v3: T3, v4: T4, v5: T5, v6: T6) => Observable<R>;
export function $bindCallback<T>(
  callbackFunc: Function
): (...args: any[]) => Observable<T>;
export function $bindCallback<T>(
  callbackFunc: Function
): (...args: any[]) => Observable<T> {
  return function(this: any, ...args: any[]): Observable<T> {
    const context = this;

    return new Observable(observer => {
      function handlerFn(val?: T, ...rest: any[]) {
        if (rest.length > 0) {
          // If we've received more than two arguments, the function doesn't
          // follow the common Node.js callback style. We could return an array
          // if that happened, but as most code follow the pattern we don't
          // special case it for now.
          observer.error(new Error('Callback called with too many args'));
        } else {
          observer.next(val!);
          observer.complete();
        }
      }

      callbackFunc.apply(context, [...args, handlerFn]);
    });
  };
}
