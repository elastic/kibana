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
  describe('histogram format', () => {
    it('is valid', () => {
      const result = formatSchema.safeParse({
        type: 'histogram',
        params: {
          format: 'number',
          pattern: '0,0.[00]',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'histogram',
        params: {
          format: 'number',
          pattern: '0,0.[00]',
        },
      });
    });

    it('is valid without pattern', () => {
      const result = formatSchema.safeParse({
        type: 'histogram',
        params: {
          format: 'bytes',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'histogram',
        params: {
          format: 'bytes',
        },
      });
    });

    it('returns an error for invalid format', () => {
      const result = formatSchema.safeParse({
        type: 'histogram',
        params: {
          format: 'currency',
          pattern: '0,0.[00]',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid input');
    });
  });
});
