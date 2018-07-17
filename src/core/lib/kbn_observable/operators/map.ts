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

import { OperatorFunction } from '../interfaces';
import { Observable } from '../observable';

/**
 * Modifies each value from the source by passing it to `fn(item, i)` and
 * emitting the return value of that function instead.
 *
 * @param fn The function to apply to each `value` emitted by the source
 * Observable. The `index` parameter is the number `i` for the i-th emission
 * that has happened since the subscription, starting from the number `0`.
 * @return An Observable that emits the values from the source Observable
 * transformed by the given `fn` function.
 */
export function map<T, R>(fn: (value: T, index: number) => R): OperatorFunction<T, R> {
  return function mapOperation(source) {
    return new Observable(observer => {
      let i = 0;

      return source.subscribe({
        next(value) {
          let result: R;
          try {
            result = fn(value, i++);
          } catch (e) {
            observer.error(e);
            return;
          }
          observer.next(result);
        },
        error(error) {
          observer.error(error);
        },
        complete() {
          observer.complete();
        },
      });
    });
  };
}
