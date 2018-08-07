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

import { Observable, ObservableInput } from '../observable';
import { $from } from './from';

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
export function $combineLatest<T>(...observables: Array<ObservableInput<T>>): Observable<T[]>;

/**
 * Creates an observable that combines the values by subscribing to all
 * observables passed and emiting an array with the latest value from each
 * observable once after each observable has emitted at least once, and again
 * any time an observable emits after that.
 *
 * @param {Observable...}
 * @return {Observable}
 */
export function $combineLatest<T>(...observables: Array<ObservableInput<T>>): Observable<T[]> {
  return new Observable(observer => {
    // create an array that will receive values as observables
    // update and initialize it with `pending` symbols so that
    // we know when observables emit for the first time
    const values: Array<symbol | T> = observables.map(() => pending);

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

    return () => {
      subs.forEach(sub => {
        sub.unsubscribe();
      });
      values.length = 0;
    };
  });
}
