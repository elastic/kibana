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
import { pipe } from '../lib';
import { ifEmpty } from './if_empty';
import { last } from './last';
import { scan } from './scan';

/**
 * Applies the accumulator function to every value in the source observable and
 * emits the return value when the source completes.
 *
 * It's like {@link scan}, but only emits when the source observable completes,
 * not the current accumulation whenever the source emits a value.
 *
 * If no values are emitted, the `initialValue` will be emitted.
 *
 * @param accumulator The accumulator function called on each source value.
 * @param initialValue The initial accumulation value.
 * @return An Observable that emits a single value that is the result of
 * accumulating the values emitted by the source Observable.
 */
export function reduce<T, R>(
  accumulator: (acc: R, value: T, index: number) => R,
  initialValue: R
): OperatorFunction<T, R> {
  return function reduceOperation(source) {
    return pipe(
      scan(accumulator, initialValue),
      ifEmpty(() => initialValue),
      last()
    )(source);
  };
}
