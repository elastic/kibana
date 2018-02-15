import { Observable } from '../Observable';

export function $bindNodeCallback<R>(
  callbackFunc: (callback: (err: any, result: R) => any) => any
): () => Observable<R>;
export function $bindNodeCallback<T, R>(
  callbackFunc: (v1: T, callback: (err: any, result: R) => any) => any
): (v1: T) => Observable<R>;
export function $bindNodeCallback<T, T2, R>(
  callbackFunc: (v1: T, v2: T2, callback: (err: any, result: R) => any) => any
): (v1: T, v2: T2) => Observable<R>;
export function $bindNodeCallback<T, T2, T3, R>(
  callbackFunc: (
    v1: T,
    v2: T2,
    v3: T3,
    callback: (err: any, result: R) => any
  ) => any
): (v1: T, v2: T2, v3: T3) => Observable<R>;
export function $bindNodeCallback<T, T2, T3, T4, R>(
  callbackFunc: (
    v1: T,
    v2: T2,
    v3: T3,
    v4: T4,
    callback: (err: any, result: R) => any
  ) => any
): (v1: T, v2: T2, v3: T3, v4: T4) => Observable<R>;
export function $bindNodeCallback<T, T2, T3, T4, T5, R>(
  callbackFunc: (
    v1: T,
    v2: T2,
    v3: T3,
    v4: T4,
    v5: T5,
    callback: (err: any, result: R) => any
  ) => any
): (v1: T, v2: T2, v3: T3, v4: T4, v5: T5) => Observable<R>;
export function $bindNodeCallback<T, T2, T3, T4, T5, T6, R>(
  callbackFunc: (
    v1: T,
    v2: T2,
    v3: T3,
    v4: T4,
    v5: T5,
    v6: T6,
    callback: (err: any, result: R) => any
  ) => any
): (v1: T, v2: T2, v3: T3, v4: T4, v5: T5, v6: T6) => Observable<R>;

/**
 * Converts a Node.js-style callback API to a function that returns an
 * Observable.
 *
 * Does NOT handle functions whose callbacks have
 * more than two parameters. Only the first value after the
 * error argument will be returned.
 *
 * Example: Read a file from the filesystem and get the data as an Observable:
 *
 *     import * as fs from 'fs';
 *     var readFileAsObservable = $bindNodeCallback(fs.readFile);
 *     var result = readFileAsObservable('./roadNames.txt', 'utf8');
 *     result.subscribe(
 *       x => console.log(x),
 *       e => console.error(e)
 *     );
 */
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
