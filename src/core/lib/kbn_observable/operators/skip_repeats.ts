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

const isStrictlyEqual = (a: any, b: any) => a === b;

/**
 * Returns an Observable that emits all items emitted by the source Observable
 * that are not equal to the previous item.
 *
 * @param [equals] Optional comparison function called to test if an item is
 * equal to the previous item in the source. Should return `true` if equal,
 * otherwise `false`. By default compares using reference equality, aka `===`.
 * @return An Observable that emits items from the source Observable with
 * distinct values.
 */
export function skipRepeats<T>(
  equals: (x: T, y: T) => boolean = isStrictlyEqual
): MonoTypeOperatorFunction<T> {
  return function skipRepeatsOperation(source) {
    return new Observable(observer => {
      let hasInitialValue = false;
      let currentValue: T;

      return source.subscribe({
        next(value) {
          if (!hasInitialValue) {
            hasInitialValue = true;
            currentValue = value;
            observer.next(value);
            return;
          }

          const isEqual = equals(currentValue, value);

          if (!isEqual) {
            observer.next(value);
            currentValue = value;
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
