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

import { filter, mergeMap } from 'rxjs/operators';
import { from } from 'rxjs';
import { BatchItem } from './types';

export function isBatchDone(items: Array<BatchItem<any, any>>): boolean {
  return items.every((item) => item.done);
}

export function getBatchDone$(items: Array<BatchItem<any, any>>) {
  // Triggers when all requests were resolved, rejected or aborted
  return from(items).pipe(
    mergeMap((item) => {
      return new Promise<boolean>((resolve) => {
        const onDone = () => {
          if (item.done) return;

          item.done = true;
          item.signal?.removeEventListener('abort', onDone);
          resolve(isBatchDone(items));
        };

        item.signal?.addEventListener('abort', onDone);
        item.future.promise.then(onDone, onDone);
      });
    }),
    filter((allDone) => allDone)
  );
}
