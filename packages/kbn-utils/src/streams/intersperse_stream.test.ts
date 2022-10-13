/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createPromiseFromStreams,
  createListStream,
  createIntersperseStream,
  createConcatStream,
} from '.';

describe('intersperseStream', () => {
  test('places the intersperse value between each provided value', async () => {
    expect(
      await createPromiseFromStreams([
        createListStream(['to', 'be', 'or', 'not', 'to', 'be']),
        createIntersperseStream(' '),
        createConcatStream(),
      ])
    ).toBe('to be or not to be');
  });

  test('emits values as soon as possible, does not needlessly buffer', async () => {
    const str = createIntersperseStream('y');
    const onData = jest.fn();
    str.on('data', onData);

    str.write('a');
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData.mock.calls[0]).toEqual(['a']);
    onData.mockClear();

    str.write('b');
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData.mock.calls[0]).toEqual(['y']);
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData.mock.calls[1]).toEqual(['b']);
  });
});
