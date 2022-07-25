/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createListStream } from '.';

describe('listStream', () => {
  test('provides the values in the initial list', async () => {
    const str = createListStream([1, 2, 3, 4]);
    const onData = jest.fn();
    str.on('data', onData);

    await new Promise((resolve) => str.on('end', resolve));

    expect(onData).toHaveBeenCalledTimes(4);
    expect(onData.mock.calls[0]).toEqual([1]);
    expect(onData.mock.calls[1]).toEqual([2]);
    expect(onData.mock.calls[2]).toEqual([3]);
    expect(onData.mock.calls[3]).toEqual([4]);
  });

  test('does not modify the list passed', async () => {
    const list = [1, 2, 3, 4];
    const str = createListStream(list);
    str.resume();
    await new Promise((resolve) => str.on('end', resolve));
    expect(list).toEqual([1, 2, 3, 4]);
  });
});
