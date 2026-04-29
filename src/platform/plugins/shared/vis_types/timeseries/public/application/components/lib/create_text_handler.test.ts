/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTextHandler } from './create_text_handler';

describe('createTextHandler()', () => {
  let handleChange: jest.Mock;
  let changeHandler: ReturnType<typeof createTextHandler>;
  let event: React.ChangeEvent<HTMLInputElement>;

  beforeEach(() => {
    handleChange = jest.fn();
    changeHandler = createTextHandler(handleChange);
    event = {
      preventDefault: jest.fn(),
      target: { value: 'foo' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    const fn = changeHandler('axis_scale');
    fn(event);
  });

  test('calls handleChange() function with partial', () => {
    expect(handleChange.mock.calls.length).toEqual(1);
    expect(handleChange.mock.calls[0][0]).toEqual({
      axis_scale: 'foo',
    });
  });
});
