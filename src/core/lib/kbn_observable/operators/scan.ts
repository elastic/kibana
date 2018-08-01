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
 * Applies the accumulator function to every value in the source stream and
 * emits the return value of each invocation.
 *
 * It's like {@link reduce}, but emits the current accumulation whenever the
 * source emits a value instead of emitting only when completed.
 *
 * @param accumulator The accumulator function called on each source value.
 * @param initialValue The initial accumulation value.
 * @return An observable of the accumulated values.
 */
export function scan<T, R>(
  accumulator: (acc: R, value: T, index: number) => R,
  initialValue: R
): OperatorFunction<T, R> {
  return function scanOperation(source) {
    return new Observable(observer => {
      let i = -1;
      let acc = initialValue;

      return source.subscribe({
        next(value) {
          i += 1;

          try {
            acc = accumulator(acc, value, i);

            observer.next(acc);
          } catch (error) {
            observer.error(error);
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
