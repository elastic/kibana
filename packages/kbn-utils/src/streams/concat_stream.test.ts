/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createListStream, createPromiseFromStreams, createConcatStream } from '.';

describe('concatStream', () => {
  test('accepts an initial value', async () => {
    const output = await createPromiseFromStreams([
      createListStream([1, 2, 3]),
      createConcatStream([0]),
    ]);

    expect(output).toEqual([0, 1, 2, 3]);
  });

  describe(`combines using the previous value's concat method`, () => {
    test('works with strings', async () => {
      const output = await createPromiseFromStreams([
        createListStream(['a', 'b', 'c']),
        createConcatStream(),
      ]);
      expect(output).toEqual('abc');
    });

    test('works with arrays', async () => {
      const output = await createPromiseFromStreams([
        createListStream([[1], [2, 3, 4], [10]]),
        createConcatStream(),
      ]);
      expect(output).toEqual([1, 2, 3, 4, 10]);
    });

    test('works with a mixture, starting with array', async () => {
      const output = await createPromiseFromStreams([
        createListStream([[], 1, 2, 3, 4, [5, 6, 7]]),
        createConcatStream(),
      ]);
      expect(output).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    test('fails when the value does not have a concat method', async () => {
      let promise;
      try {
        promise = createPromiseFromStreams([createListStream([1, '1']), createConcatStream()]);
      } catch (err) {
        throw new Error('createPromiseFromStreams() should not fail synchronously');
      }

      try {
        await promise;
        throw new Error('Promise should have rejected');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('concat');
      }
    });
  });
});
