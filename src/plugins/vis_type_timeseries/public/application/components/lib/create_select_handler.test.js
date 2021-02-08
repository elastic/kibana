/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSelectHandler } from './create_select_handler';

describe('createSelectHandler()', () => {
  let handleChange;
  let changeHandler;

  beforeEach(() => {
    handleChange = jest.fn();
    changeHandler = createSelectHandler(handleChange);
    const fn = changeHandler('test');
    fn([{ value: 'foo' }]);
  });

  test('calls handleChange() function with partial', () => {
    expect(handleChange.mock.calls.length).toEqual(1);
    expect(handleChange.mock.calls[0][0]).toEqual({
      test: 'foo',
    });
  });
});
