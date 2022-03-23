/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { upperFirst } from './string_utils';

describe('StringUtils', () => {
  describe('upperFirst', () => {
    test('should converts the first character of string to upper case', () => {
      expect(upperFirst()).toBe('');
      expect(upperFirst('')).toBe('');

      expect(upperFirst('Fred')).toBe('Fred');
      expect(upperFirst('fred')).toBe('Fred');
      expect(upperFirst('FRED')).toBe('FRED');
    });
  });
});
