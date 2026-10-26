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
  describe('static_lookup format', () => {
    it('is valid', () => {
      const result = formatSchema.safeParse({
        type: 'static_lookup',
        params: {
          lookup_entries: [
            { key: '200', value: 'OK' },
            { key: '404', value: 'Not Found' },
          ],
          unknown_key_value: 'Unknown',
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'static_lookup',
        params: {
          lookup_entries: [
            { key: '200', value: 'OK' },
            { key: '404', value: 'Not Found' },
          ],
          unknown_key_value: 'Unknown',
        },
      });
    });

    it('is valid without unknown_key_value', () => {
      const result = formatSchema.safeParse({
        type: 'static_lookup',
        params: {
          lookup_entries: [{ key: '200', value: 'OK' }],
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'static_lookup',
        params: {
          lookup_entries: [{ key: '200', value: 'OK' }],
        },
      });
    });

    it('returns an error for invalid lookup entry', () => {
      const result = formatSchema.safeParse({
        type: 'static_lookup',
        params: {
          lookup_entries: [{ key: 200, value: 'OK' }],
        },
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('expected string');
    });
  });
});
