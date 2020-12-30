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

import { createBatchedFunction } from '../create_batched_function';

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
