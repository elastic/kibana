/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounceByKey } from './debounce_by_key';

describe('debounceByKey', () => {
  test('debounce, confirm params', async () => {
    const fn = jest.fn();
    const fn2 = jest.fn();

    const debouncedFn = debounceByKey(fn, 1000);
    const debouncedFn2 = debounceByKey(fn2, 1000);

    // debounces based on key, not params
    debouncedFn('a')(1);
    debouncedFn('a')(2);

    debouncedFn2('b')(2);
    debouncedFn2('b')(1);

    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith(1);
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).toBeCalledWith(2);
  });
});
