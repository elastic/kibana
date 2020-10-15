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

import { ItemBufferParams } from './item_buffer';
import { TimedItemBufferParams, TimedItemBuffer } from './timed_item_buffer';

type Fn = (...args: any) => any;

export interface BatchedFunctionParams<Func extends Fn, BatchEntry> {
  onCall: (...args: Parameters<Func>) => [ReturnType<Func>, BatchEntry];
  onBatch: (items: BatchEntry[]) => void;
  flushOnMaxItems?: ItemBufferParams<any>['flushOnMaxItems'];
  maxItemAge?: TimedItemBufferParams<any>['maxItemAge'];
}

export const createBatchedFunction = <Func extends Fn, BatchEntry>(
  params: BatchedFunctionParams<Func, BatchEntry>
): [Func, TimedItemBuffer<BatchEntry>] => {
  const { onCall, onBatch, maxItemAge = 10, flushOnMaxItems = 25 } = params;
  const buffer = new TimedItemBuffer<BatchEntry>({
    onFlush: onBatch,
    maxItemAge,
    flushOnMaxItems,
  });

  const fn: Func = ((...args) => {
    const [result, batchEntry] = onCall(...args);
    buffer.write(batchEntry);
    return result;
  }) as Func;

  return [fn, buffer];
};
