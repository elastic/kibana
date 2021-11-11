/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';

import { createPromiseFromStreams } from './promise_from_streams';
import { createListStream } from './list_stream';
import { createMapStream } from './map_stream';
import { createConcatStream } from './concat_stream';

describe('createMapStream()', () => {
  test('calls the function with each item in the source stream', async () => {
    const mapper = jest.fn();

    await createPromiseFromStreams([createListStream(['a', 'b', 'c']), createMapStream(mapper)]);

    expect(mapper).toHaveBeenCalledTimes(3);
    expect(mapper).toHaveBeenCalledWith('a', 0);
    expect(mapper).toHaveBeenCalledWith('b', 1);
    expect(mapper).toHaveBeenCalledWith('c', 2);
  });

  test('send the return value from the mapper on the output stream', async () => {
    const result = await createPromiseFromStreams([
      createListStream([1, 2, 3]),
      createMapStream((n: number) => n * 100),
      createConcatStream([]),
    ]);

    expect(result).toEqual([100, 200, 300]);
  });

  test('supports async mappers', async () => {
    const result = await createPromiseFromStreams([
      createListStream([1, 2, 3]),
      createMapStream(async (n: number, i: number) => {
        await setTimeoutAsync(n);
        return n * i;
      }),
      createConcatStream([]),
    ]);

    expect(result).toEqual([0, 2, 6]);
  });

  test('handles errors in async mappers', async () => {
    await expect(
      createPromiseFromStreams([
        createListStream([1, 2, 3]),
        createMapStream(async (n: number, i: number) => {
          if (n === 2) {
            await Promise.reject(new Error('that went bad'));
          }
          return n;
        }),
        createConcatStream([]),
      ])
    ).rejects.toMatchInlineSnapshot(`[Error: that went bad]`);
  });
});
