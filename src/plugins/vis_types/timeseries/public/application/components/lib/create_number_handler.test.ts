/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createNumberHandler } from './create_number_handler';

describe('createNumberHandler()', () => {
  let handleChange: jest.Mock;
  let changeHandler: ReturnType<typeof createNumberHandler>;
  let event: React.ChangeEvent<HTMLInputElement>;

  beforeEach(() => {
    handleChange = jest.fn();
    changeHandler = createNumberHandler(handleChange);
    event = {
      preventDefault: jest.fn(),
      target: { value: '1' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    const fn = changeHandler('unit');
    fn(event);
  });

  test('calls handleChange() function with partial', () => {
    expect(handleChange.mock.calls.length).toEqual(1);
    expect(handleChange.mock.calls[0][0]).toEqual({
      unit: 1,
    });
  });
});
