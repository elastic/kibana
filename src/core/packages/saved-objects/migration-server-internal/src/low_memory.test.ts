/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import v8 from 'v8';
import {
  LOW_MEMORY_BATCH_SIZE,
  LOW_MEMORY_HEAP_SIZE_LIMIT_BYTES,
  isMemoryConstrained,
} from './low_memory';

describe('isMemoryConstrained', () => {
  it('returns true when the provided heap size limit is below the threshold', () => {
    expect(isMemoryConstrained(LOW_MEMORY_HEAP_SIZE_LIMIT_BYTES - 1)).toBe(true);
    expect(isMemoryConstrained(512 * 1024 * 1024)).toBe(true);
  });

  it('returns false when the provided heap size limit is at or above the threshold', () => {
    expect(isMemoryConstrained(LOW_MEMORY_HEAP_SIZE_LIMIT_BYTES)).toBe(false);
    expect(isMemoryConstrained(2 * 1024 * 1024 * 1024)).toBe(false);
  });

  it('defaults to the V8 heap size limit of the current process', () => {
    const spy = jest
      .spyOn(v8, 'getHeapStatistics')
      .mockReturnValue({ heap_size_limit: 512 * 1024 * 1024 } as v8.HeapInfo);

    expect(isMemoryConstrained()).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockReturnValue({ heap_size_limit: 4 * 1024 * 1024 * 1024 } as v8.HeapInfo);
    expect(isMemoryConstrained()).toBe(false);

    spy.mockRestore();
  });

  it('uses a 1GB heap size limit as the threshold', () => {
    expect(LOW_MEMORY_HEAP_SIZE_LIMIT_BYTES).toBe(1 * 1024 * 1024 * 1024);
  });

  it('uses a reduced batch size of 100', () => {
    expect(LOW_MEMORY_BATCH_SIZE).toBe(100);
  });
});
