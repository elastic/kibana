import { Observable } from '../observable';

/**
 * Converts a Node.js-style callback API to a function that returns an
 * Observable.
 *
 * It's just like {@link $bindCallback}, but the callback is expected to be of
 * type `callback(error, result)`.
 *
 * The input is a function `func` with some parameters, but the last parameter
 * must be a callback function that `func` calls when it is done. The callback
 * function is expected to follow Node.js conventions, where the first argument
 * to the callback is an error object, signaling whether call was successful. If
 * that object is passed to callback, it means something went wrong.
 *
 * The output of `bindNodeCallback` is a function that takes the same
 * parameters as `func`, except the last one (the callback). When the output
 * function is called with arguments, it will return an Observable. If `func`
 * calls its callback with an error parameter present, the Observable will error
 * with that value as well. If an error parameter is not passed, the Observable
 * will emit the second parameter.
 *
 * NB! Does NOT handle functions whose callbacks have more than two parameters.
 * If more than one argument is passed to the callback, the observable will emit
 * an error instead of the values.
 *
 * Example: Read a file from the filesystem and get the data as an Observable:
 *
 * ```js
 * import fs from 'fs';
 *
 * const readFileAsObservable = $bindNodeCallback(fs.readFile);
 * const result = readFileAsObservable('./roadNames.txt', 'utf8');
 *
 * result.subscribe({
 *   next(x) {
 *     console.log(x)
 *   },
 *   error(e) {
 *     console.error(e)
 *   }
 * });
 * ```
 *
 * After the Observable emits a value, it will complete immediately. This means
 * even if `func` calls callback again, values from second and consecutive
 * calls will never appear on the stream.
 *
 * Note that `$bindNodeCallback` can be used in non-Node.js environments as
 * well. "Node.js-style" callbacks are just a convention, so if you write for
 * browsers or any other environment and API you use implements that callback
 * style, `$bindNodeCallback` can be safely used on that API functions as well.
 *
 * Implementation detail:
 * This contains multiple overloads for `$bindNodeCallback` to enable stricter
 * typing by matching each argument of the passed in `callbackFunc`. See
 * https://www.typescriptlang.org/docs/handbook/functions.html#overloads for
 * details about overloading.
 *
 * @param callbackFunc A function with a Node.js style "error first" callback as
 * the last parameter.
 * @return A function which returns the Observable that delivers the same values
 * the callback would deliver.
 */
export function $bindNodeCallback<R>(
  callbackFunc: (callback: (err: any, result: R) => void) => void
): () => Observable<R>;
export function $bindNodeCallback<T, R>(
  callbackFunc: (v1: T, callback: (err: any, result: R) => void) => void
): (v1: T) => Observable<R>;
export function $bindNodeCallback<T, T2, R>(
  callbackFunc: (v1: T, v2: T2, callback: (err: any, result: R) => void) => void
): (v1: T, v2: T2) => Observable<R>;
export function $bindNodeCallback<T, T2, T3, R>(
  callbackFunc: (
    v1: T,
    v2: T2,
    v3: T3,
    callback: (err: any, result: R) => void
  ) => void
): (v1: T, v2: T2, v3: T3) => Observable<R>;
export function $bindNodeCallback<T, T2, T3, T4, R>(
  callbackFunc: (
    v1: T,
    v2: T2,
    v3: T3,
    v4: T4,
    callback: (err: any, result: R) => void
  ) => void
): (v1: T, v2: T2, v3: T3, v4: T4) => Observable<R>;
export function $bindNodeCallback<T, T2, T3, T4, T5, R>(
  callbackFunc: (
    v1: T,
    v2: T2,
    v3: T3,
    v4: T4,
    v5: T5,
    callback: (err: any, result: R) => void
  ) => void
): (v1: T, v2: T2, v3: T3, v4: T4, v5: T5) => Observable<R>;
export function $bindNodeCallback<T, T2, T3, T4, T5, T6, R>(
  callbackFunc: (
    v1: T,
    v2: T2,
    v3: T3,
    v4: T4,
    v5: T5,
    v6: T6,
    callback: (err: any, result: R) => void
  ) => void
): (v1: T, v2: T2, v3: T3, v4: T4, v5: T5, v6: T6) => Observable<R>;
export function $bindNodeCallback<T>(callbackFunc: Function) {
  return function(this: any, ...args: any[]): Observable<T> {
    const context = this;

    return new Observable(observer => {
      function handlerFn(err?: Error, val?: T, ...rest: any[]) {
        if (err != null) {
          observer.error(err);
        } else if (rest.length > 0) {
          // If we've received more than two arguments, the function doesn't
          // follow the common Node.js callback style. We could return an array
          // if that happened, but as most code follow the pattern we don't
          // special case it for now.
          observer.error(new Error('Node callback called with too many args'));
        } else {
          observer.next(val!);
          observer.complete();
        }
      }

      callbackFunc.apply(context, args.concat([handlerFn]));
    });
  };
}
