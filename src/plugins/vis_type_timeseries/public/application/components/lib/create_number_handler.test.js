/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createNumberHandler } from './create_number_handler';

describe('createNumberHandler()', () => {
  let handleChange;
  let changeHandler;
  let event;

  beforeEach(() => {
    handleChange = jest.fn();
    changeHandler = createNumberHandler(handleChange);
    event = { preventDefault: jest.fn(), target: { value: '1' } };
    const fn = changeHandler('test');
    fn(event);
  });

  test('calls handleChange() function with partial', () => {
    expect(event.preventDefault.mock.calls.length).toEqual(1);
    expect(handleChange.mock.calls.length).toEqual(1);
    expect(handleChange.mock.calls[0][0]).toEqual({
      test: 1,
    });
  });
});
