/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createTextHandler } from './create_text_handler';

describe('createTextHandler()', () => {
  let handleChange;
  let changeHandler;
  let event;

  beforeEach(() => {
    handleChange = jest.fn();
    changeHandler = createTextHandler(handleChange);
    event = { preventDefault: jest.fn(), target: { value: 'foo' } };
    const fn = changeHandler('test');
    fn(event);
  });

  test('calls handleChange() function with partial', () => {
    expect(event.preventDefault.mock.calls.length).toEqual(1);
    expect(handleChange.mock.calls.length).toEqual(1);
    expect(handleChange.mock.calls[0][0]).toEqual({
      test: 'foo',
    });
  });
});
