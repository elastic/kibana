/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatSchema } from './format_schema';

describe('formatSchema', () => {
  describe('relative_date format', () => {
    it('is valid', () => {
      const result = formatSchema.safeParse({
        type: 'relative_date',
      });
      expect(result.success).toBe(true);
    });

    it('ignores params', () => {
      const result = formatSchema.safeParse({
        type: 'relative_date',
        params: {
          pattern: 'irrelevant',
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'relative_date',
      });
    });
  });
});
