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
  describe('duration format', () => {
    it('is valid', () => {
      const result = formatSchema.safeParse({
        type: 'duration',
        params: {
          input_format: 'seconds',
          output_format: 'humanize',
          output_precision: 2,
          show_suffix: true,
          use_short_suffix: false,
          include_space_with_suffix: true,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'duration',
        params: {
          input_format: 'seconds',
          output_format: 'humanize',
          output_precision: 2,
          show_suffix: true,
          use_short_suffix: false,
          include_space_with_suffix: true,
        },
      });
    });

    it('is valid with required params only', () => {
      const result = formatSchema.safeParse({
        type: 'duration',
        params: {
          input_format: 'seconds',
          output_format: 'as_minutes',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'duration',
        params: {
          input_format: 'seconds',
          output_format: 'as_minutes',
          output_precision: 2,
          use_short_suffix: false,
          include_space_with_suffix: true,
        },
      });
    });

    it('returns an error for invalid input_format', () => {
      const result = formatSchema.safeParse({
        type: 'duration',
        params: {
          input_format: 'fortnights',
          output_format: 'as_minutes',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid input');
    });
  });
});
