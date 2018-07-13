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

import { EmptyError } from '../errors';
import { MonoTypeOperatorFunction } from '../interfaces';
import { Observable } from '../observable';

/**
 * Emits the first value emitted by the source Observable, then immediately
 * completes.
 *
 * @throws {EmptyError} Delivers an EmptyError to the Observer's `error`
 * callback if the Observable completes before any `next` notification was sent.
 *
 * @returns An Observable of the first item received.
 */
export function first<T>(): MonoTypeOperatorFunction<T> {
  return function firstOperation(source) {
    return new Observable(observer => {
      return source.subscribe({
        next(value) {
          observer.next(value);
          observer.complete();
        },
        error(error) {
          observer.error(error);
        },
        complete() {
          // The only time we end up here, is if we never received any values.
          observer.error(new EmptyError('first()'));
        },
      });
    });
  };
}
