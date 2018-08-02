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

import { $from } from '../factories';
import { OperatorFunction } from '../interfaces';
import { Observable, ObservableInput } from '../observable';

/**
 * Projects each source value to an Observable which is merged in the output
 * Observable.
 *
 * Example:
 *
 * ```js
 * const source = Observable.from([1, 2, 3]);
 * const observable = k$(source)(
 *   mergeMap(x => Observable.of('a', x + 1))
 * );
 * ```
 *
 * Results in the following items emitted:
 * - a
 * - 2
 * - a
 * - 3
 * - a
 * - 4
 *
 * As you can see it merges the returned observable and emits every value from
 * that observable. You can think of it as being the same as `flatMap` on an
 * array, just that you return an Observable instead of an array.
 *
 * For more complex use-cases where you need the source variable for each value
 * in the newly created observable, an often used pattern is using `map` within
 * the `mergeMap`. E.g. let's say we want to return both the current value and
 * the newly created value:
 *
 * ```js
 * mergeMap(val =>
 *   k$(someFn(val))(
 *     map(newVal => ({ val, newVal })
 *   )
 * )
 * ```
 *
 * Here you would go from having an observable of `val`s, to having an
 * observable of `{ val, newVal }` objects.
 *
 * @param project A function that, when applied to an item emitted by the source
 * Observable, returns an Observable.
 */
export function mergeMap<T, R>(
  project: (value: T, index: number) => ObservableInput<R>
): OperatorFunction<T, R> {
  return function mergeMapOperation(source) {
    return new Observable(destination => {
      let completed = false;
      let active = 0;
      let i = 0;

      source.subscribe({
        next(value) {
          let result;
          try {
            result = project(value, i++);
          } catch (error) {
            destination.error(error);
            return;
          }
          active++;

          $from(result).subscribe({
            next(innerValue) {
              destination.next(innerValue);
            },
            error(err) {
              destination.error(err);
            },
            complete() {
              active--;

              if (active === 0 && completed) {
                destination.complete();
              }
            },
          });
        },

        error(err) {
          destination.error(err);
        },

        complete() {
          completed = true;
          if (active === 0) {
            destination.complete();
          }
        },
      });
    });
  };
}
