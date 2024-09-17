/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
