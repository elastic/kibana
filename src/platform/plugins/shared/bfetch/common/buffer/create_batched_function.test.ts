/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createBatchedFunction } from './create_batched_function';

describe('createBatchedFunction', () => {
  test('calls onCall every time fn is called, calls onBatch once flushOnMaxItems reached', async () => {
    const onBatch = jest.fn();
    const onCall = jest.fn(() => [1, 2] as any);
    const [fn] = createBatchedFunction({
      onBatch,
      onCall,
      flushOnMaxItems: 2,
      maxItemAge: 10,
    });

    expect(onCall).toHaveBeenCalledTimes(0);
    expect(onBatch).toHaveBeenCalledTimes(0);

    fn(123);

    expect(onCall).toHaveBeenCalledTimes(1);
    expect(onCall).toHaveBeenCalledWith(123);
    expect(onBatch).toHaveBeenCalledTimes(0);

    fn(456);

    expect(onCall).toHaveBeenCalledTimes(2);
    expect(onCall).toHaveBeenCalledWith(456);
    expect(onBatch).toHaveBeenCalledTimes(1);
    expect(onBatch).toHaveBeenCalledWith([2, 2]);
  });

  test('calls onBatch once timeout is reached', async () => {
    const onBatch = jest.fn();
    const onCall = jest.fn(() => [4, 3] as any);
    const [fn] = createBatchedFunction({
      onBatch,
      onCall,
      flushOnMaxItems: 2,
      maxItemAge: 10,
    });

    expect(onCall).toHaveBeenCalledTimes(0);
    expect(onBatch).toHaveBeenCalledTimes(0);

    fn(123);

    expect(onCall).toHaveBeenCalledTimes(1);
    expect(onCall).toHaveBeenCalledWith(123);
    expect(onBatch).toHaveBeenCalledTimes(0);

    await new Promise((r) => setTimeout(r, 15));

    expect(onCall).toHaveBeenCalledTimes(1);
    expect(onBatch).toHaveBeenCalledTimes(1);
    expect(onBatch).toHaveBeenCalledWith([3]);
  });
});
