/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFilterDepth } from './filters_editor_utils';

describe('filters_editor_utils', () => {
  describe('getFilterDepth', () => {
    test('should return correct depth level', () => {
      expect(getFilterDepth('')).toBe(1);
      expect(getFilterDepth('0')).toBe(1);
      expect(getFilterDepth('0.1')).toBe(2);
      expect(getFilterDepth('0.1.1.5')).toBe(4);
    });
  });
});
