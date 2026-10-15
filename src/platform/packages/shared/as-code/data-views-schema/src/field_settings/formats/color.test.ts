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
  describe('color format', () => {
    it('is valid for string field type', () => {
      const result = formatSchema.safeParse({
        type: 'color',
        params: {
          field_type: 'string',
          colors: [
            {
              regex: '.*',
              text: '#FFFFFF',
              background: '#000000',
            },
          ],
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'color',
        params: {
          field_type: 'string',
          colors: [
            {
              regex: '.*',
              text: '#FFFFFF',
              background: '#000000',
            },
          ],
        },
      });
    });

    it('is valid for number field type', () => {
      const result = formatSchema.safeParse({
        type: 'color',
        params: {
          field_type: 'number',
          colors: [
            {
              range: '-Infinity:Infinity',
              text: '#FFFFFF',
              background: '#000000',
            },
          ],
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'color',
        params: {
          field_type: 'number',
          colors: [
            {
              range: '-Infinity:Infinity',
              text: '#FFFFFF',
              background: '#000000',
            },
          ],
        },
      });
    });

    it('is valid for boolean field type', () => {
      const result = formatSchema.safeParse({
        type: 'color',
        params: {
          field_type: 'boolean',
          colors: [
            {
              boolean: true,
              text: '#FFFFFF',
              background: '#000000',
            },
          ],
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'color',
        params: {
          field_type: 'boolean',
          colors: [
            {
              boolean: true,
              text: '#FFFFFF',
              background: '#000000',
            },
          ],
        },
      });
    });

    it('returns an error for invalid typed params', () => {
      const result = formatSchema.safeParse({
        type: 'color',
        params: {
          field_type: 'boolean',
          colors: [
            {
              boolean: 'true',
              text: '#FFFFFF',
              background: '#000000',
            },
          ],
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('expected boolean');
    });
  });
});
