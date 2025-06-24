/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSelectHandler, HandleChange } from './create_select_handler';

describe('createSelectHandler', () => {
  describe('createSelectHandler()', () => {
    let handleChange: HandleChange;
    let changeHandler: ReturnType<typeof createSelectHandler>;

    beforeEach(() => {
      handleChange = jest.fn();
      changeHandler = createSelectHandler(handleChange);
    });

    test('should calls handleChange() function with the correct data', () => {
      const fn = changeHandler('test');

      fn([{ value: 'foo', label: 'foo' }]);

      expect(handleChange).toHaveBeenCalledWith({
        test: 'foo',
      });
    });
  });
});
