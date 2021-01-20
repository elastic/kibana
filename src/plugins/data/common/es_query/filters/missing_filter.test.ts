/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getMissingFilterField } from './missing_filter';

describe('missing filter', function () {
  describe('getMissingFilterField', function () {
    it('should return the name of the field an missing query is targeting', () => {
      const filter = {
        missing: {
          field: 'extension',
        },
        meta: {
          disabled: false,
          negate: false,
          alias: null,
        },
      };
      const result = getMissingFilterField(filter);
      expect(result).toBe('extension');
    });
  });
});
