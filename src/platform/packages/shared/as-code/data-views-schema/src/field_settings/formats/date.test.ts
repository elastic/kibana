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
  describe('date format', () => {
    it('is valid', () => {
      const result = formatSchema.safeParse({
        type: 'date',
        params: {
          pattern: 'MMM D, YYYY @ HH:mm:ss.SSS',
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'date',
        params: {
          pattern: 'MMM D, YYYY @ HH:mm:ss.SSS',
        },
      });
    });

    it('is valid without params', () => {
      const result = formatSchema.safeParse({
        type: 'date',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'date',
      });
    });

    it('returns an error for invalid pattern', () => {
      const result = formatSchema.safeParse({
        type: 'date',
        params: {
          pattern: 1234,
        },
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('expected string');
    });
  });
});
