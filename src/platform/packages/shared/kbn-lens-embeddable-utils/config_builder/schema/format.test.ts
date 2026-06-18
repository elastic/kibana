/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectPrettyError } from '@kbn/zod-helpers/v4';
import { formatTypeSchema, formatSchema } from './format';

describe('Format Schemas', () => {
  describe('numericFormat', () => {
    it('validates a valid number format configuration', () => {
      const input = {
        type: 'number' as const,
        decimals: 2,
        suffix: '%',
        compact: true,
      };

      const validated = formatTypeSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates a valid percent format configuration', () => {
      const input = {
        type: 'percent' as const,
        decimals: 1,
        suffix: ' percent',
        compact: false,
      };

      const validated = formatTypeSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('applies default values', () => {
      const input = {
        type: 'number' as const,
      };

      const validated = formatTypeSchema.parse(input);
      expect(validated).toEqual({
        type: 'number',
        decimals: 2,
        compact: false,
      });
    });
  });

  describe('byteFormat', () => {
    it('validates a valid bits format configuration', () => {
      const input = {
        type: 'bits' as const,
        decimals: 2,
        suffix: '/s',
      };

      const validated = formatTypeSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates a valid bytes format configuration', () => {
      const input = {
        type: 'bytes' as const,
        decimals: 1,
        suffix: '/sec',
      };

      const validated = formatTypeSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates configuration without optional fields', () => {
      const input = {
        type: 'bytes' as const,
      };

      const validated = formatTypeSchema.parse(input);
      expect(validated).toHaveProperty('type', input.type);
    });
  });

  describe('durationFormat', () => {
    it('validates a valid duration format configuration', () => {
      const input = {
        type: 'duration' as const,
        from: 'ms',
        to: 's',
        suffix: ' duration',
      };

      const validated = formatTypeSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates duration format without suffix', () => {
      const input = {
        type: 'duration' as const,
        from: 'ms',
        to: 'min',
      };

      const validated = formatTypeSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing required fields', () => {
      const input = {
        type: 'duration' as const,
        from: 'ms',
      };

      const result = formatTypeSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });
  });

  describe('customFormat', () => {
    it('validates a valid custom format configuration', () => {
      const input = {
        type: 'custom' as const,
        pattern: '0,0.00',
      };

      const validated = formatTypeSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing pattern', () => {
      const input = {
        type: 'custom' as const,
      };

      const result = formatTypeSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });
  });

  describe('formatSchema', () => {
    it('validates with format configuration', () => {
      const input = {
        format: {
          type: 'number' as const,
          decimals: 2,
          suffix: '%',
        },
      };

      const validated = formatSchema.parse(input);
      expect(validated).toEqual({ ...input, format: { ...input.format, compact: false } });
    });

    it('validates without format configuration', () => {
      const input = {};

      const validated = formatSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('throws on invalid format type', () => {
      const input = {
        format: {
          type: 'invalid' as const,
        },
      };

      const result = formatSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input
          → at format"
      `);
    });
  });

  describe('edge cases', () => {
    it('validates numeric format with extreme decimal values', () => {
      const input = {
        type: 'number' as const,
        decimals: 10,
        suffix: '',
        compact: true,
      };

      const validated = formatTypeSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('validates byte format with empty suffix', () => {
      const input = {
        type: 'bytes' as const,
        decimals: 2,
        suffix: '',
      };

      const validated = formatTypeSchema.parse(input);
      expect(validated).toEqual(input);
    });
  });
});
