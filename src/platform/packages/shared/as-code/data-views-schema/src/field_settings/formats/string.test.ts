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
  describe('string format', () => {
    it('is valid with transform', () => {
      const result = formatSchema.safeParse({
        type: 'string',
        params: {
          transform: 'title',
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'string',
        params: {
          transform: 'title',
        },
      });
    });

    it('is valid without params', () => {
      const result = formatSchema.safeParse({
        type: 'string',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'string',
      });
    });

    it('is valid with empty params', () => {
      const result = formatSchema.safeParse({
        type: 'string',
        params: {},
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'string',
        params: {},
      });
    });

    it('returns an error for invalid transform', () => {
      const result = formatSchema.safeParse({
        type: 'string',
        params: {
          transform: 'capitalize',
        },
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid input');
    });
  });
});
