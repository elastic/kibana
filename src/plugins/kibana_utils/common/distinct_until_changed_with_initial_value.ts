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

import { MonoTypeOperatorFunction, queueScheduler, scheduled, from } from 'rxjs';
import { concatAll, distinctUntilChanged, skip } from 'rxjs/operators';

export function distinctUntilChangedWithInitialValue<T>(
  initialValue: T | Promise<T>,
  compare?: (x: T, y: T) => boolean
): MonoTypeOperatorFunction<T> {
  return input$ =>
    scheduled(
      [isPromise(initialValue) ? from(initialValue) : [initialValue], input$],
      queueScheduler
    ).pipe(concatAll(), distinctUntilChanged(compare), skip(1));
}

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as any).subscribe !== 'function' &&
    typeof (value as any).then === 'function'
  );
}
