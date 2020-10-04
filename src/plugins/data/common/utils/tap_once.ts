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

import { Observable, concat } from 'rxjs';
import { tap, take, share } from 'rxjs/operators';

/**
 * This operator will fire once per stream, even if there are no subscribers on it.
 * @param fn tap finction
 */
export function tapOnce<T>(fn: (v: T) => any) {
  return (source$: Observable<T>) => {
    let first = true;
    return source$.pipe(
      tap((payload) => {
        if (first) {
          fn(payload);
        }
        first = false;
      })
    );
  };
}
