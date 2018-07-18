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

import { $fromCallback } from '../factories';
import { MonoTypeOperatorFunction } from '../interfaces';
import { Observable } from '../observable';

/**
 * Modifies a stream so that when the source completes without emitting any
 * values a new observable is created via `factory()` (see `$fromCallback`) that
 * will be mirrored to completion.
 *
 * @param factory
 * @return
 */
export function ifEmpty<T>(factory: () => T): MonoTypeOperatorFunction<T> {
  return function ifEmptyOperation(source) {
    return new Observable(observer => {
      let hasReceivedValue = false;

      const subs = [
        source.subscribe({
          next(value) {
            hasReceivedValue = true;
            observer.next(value);
          },
          error(error) {
            observer.error(error);
          },
          complete() {
            if (hasReceivedValue) {
              observer.complete();
            } else {
              subs.push($fromCallback(factory).subscribe(observer));
            }
          },
        }),
      ];

      return () => {
        subs.forEach(sub => sub.unsubscribe());
        subs.length = 0;
      };
    });
  };
}
