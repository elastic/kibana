/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StringUtils } from './string_utils';

describe('StringUtils class', () => {
  describe('static upperFirst', () => {
    test('should converts the first character of string to upper case', () => {
      expect(StringUtils.upperFirst()).toBe('');
      expect(StringUtils.upperFirst('')).toBe('');

      expect(StringUtils.upperFirst('Fred')).toBe('Fred');
      expect(StringUtils.upperFirst('fred')).toBe('Fred');
      expect(StringUtils.upperFirst('FRED')).toBe('FRED');
    });
  });
});
