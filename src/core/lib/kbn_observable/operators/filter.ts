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

import { MonoTypeOperatorFunction } from '../interfaces';
import { Observable } from '../observable';

/**
 * Filter items emitted by the source Observable by only emitting those that
 * satisfy a specified predicate.
 *
 * @param predicate A function that evaluates each value emitted by the source
 * Observable. If it returns `true`, the value is emitted, if `false` the value
 * is not passed to the output Observable. The `index` parameter is the number
 * `i` for the i-th source emission that has happened since the subscription,
 * starting from the number `0`.
 * @return An Observable of values from the source that were allowed by the
 * `predicate` function.
 */
export function filter<T>(
  predicate: (value: T, index: number) => boolean
): MonoTypeOperatorFunction<T> {
  return function filterOperation(source) {
    return new Observable(observer => {
      let i = 0;

      return source.subscribe({
        next(value) {
          let result = false;
          try {
            result = predicate(value, i++);
          } catch (e) {
            observer.error(e);
            return;
          }
          if (result) {
            observer.next(value);
          }
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
