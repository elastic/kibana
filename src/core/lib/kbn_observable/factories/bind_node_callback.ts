/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable } from '../observable';

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
  callbackFunc: (v1: T, v2: T2, v3: T3, callback: (err: any, result: R) => any) => any
): (v1: T, v2: T2, v3: T3) => Observable<R>;
export function $bindNodeCallback<T, T2, T3, T4, R>(
  callbackFunc: (v1: T, v2: T2, v3: T3, v4: T4, callback: (err: any, result: R) => any) => any
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
 *     import fs from 'fs';
 *     var readFileAsObservable = $bindNodeCallback(fs.readFile);
 *     var result = readFileAsObservable('./roadNames.txt', 'utf8');
 *     result.subscribe(
 *       x => console.log(x),
 *       e => console.error(e)
 *     );
 */
export function $bindNodeCallback<T>(callbackFunc: (...args: any[]) => any) {
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
