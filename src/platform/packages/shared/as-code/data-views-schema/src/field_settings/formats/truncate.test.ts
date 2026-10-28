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
  describe('truncate format', () => {
    it('is valid with field_length', () => {
      const result = formatSchema.safeParse({
        type: 'truncate',
        params: {
          field_length: 100,
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'truncate',
        params: {
          field_length: 100,
        },
      });
    });

    it('is valid without params', () => {
      const result = formatSchema.safeParse({
        type: 'truncate',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'truncate',
      });
    });

    it('is valid with empty params', () => {
      const result = formatSchema.safeParse({
        type: 'truncate',
        params: {},
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'truncate',
        params: {},
      });
    });

    it('returns an error for invalid field_length', () => {
      const result = formatSchema.safeParse({
        type: 'truncate',
        params: {
          field_length: '100',
        },
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('expected number');
    });
  });
});
