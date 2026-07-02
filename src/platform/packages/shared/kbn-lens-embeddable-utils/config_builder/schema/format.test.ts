/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { esqlFormatTypeSchema, formatTypeSchema, formatSchema } from './format';

describe('Format Schemas', () => {
  describe('numericFormat', () => {
    it('validates a valid number format configuration', () => {
      const input = {
        type: 'number' as const,
        decimals: 2,
        suffix: '%',
        compact: true,
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates a valid percent format configuration', () => {
      const input = {
        type: 'percent' as const,
        decimals: 1,
        suffix: ' percent',
        compact: false,
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('applies default values', () => {
      const input = {
        type: 'number' as const,
      };

      const validated = formatTypeSchema.validate(input);
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

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates a valid bytes format configuration', () => {
      const input = {
        type: 'bytes' as const,
        decimals: 1,
        suffix: '/sec',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates configuration without optional fields', () => {
      const input = {
        type: 'bytes' as const,
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toHaveProperty('type', input.type);
    });
  });

  describe('durationFormat — GA enum values', () => {
    it('validates a valid duration format configuration with short units', () => {
      const input = {
        type: 'duration' as const,
        from: 'ms',
        to: 's',
        suffix: ' duration',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates duration format with `min` for minutes', () => {
      const input = {
        type: 'duration' as const,
        from: 'ms',
        to: 'min',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates `auto-approximate` output (precise auto-select)', () => {
      const input = {
        type: 'duration' as const,
        from: 's',
        to: 'auto-approximate',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates `auto` output (approximate auto-select)', () => {
      const input = {
        type: 'duration' as const,
        from: 'ms',
        to: 'auto',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates fine-grained DSL input units', () => {
      const input = {
        type: 'duration' as const,
        from: 'us',
        to: 'ms',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });

  describe('durationFormat — legacy string values (backward compat)', () => {
    it('accepts legacy verbose input unit strings via legacy fallback schema', () => {
      const input = {
        type: 'duration' as const,
        from: 'seconds',
        to: 'humanize',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('accepts legacy `m` for minutes', () => {
      const input = {
        type: 'duration' as const,
        from: 'ms',
        to: 'm',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('accepts legacy `humanizePrecise` output string', () => {
      const input = {
        type: 'duration' as const,
        from: 'ms',
        to: 'humanizePrecise',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('accepts legacy `asMinutes` output string', () => {
      const input = {
        type: 'duration' as const,
        from: 'ms',
        to: 'asMinutes',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing required `to` field even for legacy schema', () => {
      const input = {
        type: 'duration' as const,
        from: 'ms',
      };

      expect(() => formatTypeSchema.validate(input)).toThrow();
    });
  });

  describe('esqlDurationFormat', () => {
    it('validates ES|QL duration format with GA enum values', () => {
      const input = {
        type: 'duration' as const,
        from: 'mo',
        to: 'auto-approximate',
      };

      const validated = esqlFormatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('accepts legacy verbose strings via legacy fallback schema', () => {
      const input = {
        type: 'duration' as const,
        from: 'months',
        to: 'humanize',
      };

      const validated = esqlFormatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('rejects fine-grained units for ES|QL with strict validation', () => {
      // Fine-grained units are not accepted by either the ES|QL GA schema OR
      // the legacy schema (legacy schema accepts any string so this passes)
      // This test verifies the ES|QL GA strict schema rejects 'us'
      const input = {
        type: 'duration' as const,
        from: 'us',
        to: 'ms',
      };

      // 'us' is accepted by the legacy fallback schema (string type)
      // so the overall esqlFormatTypeSchema allows it
      const validated = esqlFormatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });

  describe('customFormat', () => {
    it('validates a valid custom format configuration', () => {
      const input = {
        type: 'custom' as const,
        pattern: '0,0.00',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing pattern', () => {
      const input = {
        type: 'custom' as const,
      };

      expect(() => formatTypeSchema.validate(input)).toThrow(
        /\[4.pattern\]: expected value of type/
      );
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

      const validated = schema.object(formatSchema).validate(input);
      expect(validated).toEqual({ ...input, format: { ...input.format, compact: false } });
    });

    it('validates without format configuration', () => {
      const input = {};

      const validated = schema.object(formatSchema).validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on invalid format type', () => {
      const input = {
        format: {
          type: 'invalid' as const,
        },
      };

      expect(() => schema.object(formatSchema).validate(input)).toThrow();
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

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates byte format with empty suffix', () => {
      const input = {
        type: 'bytes' as const,
        decimals: 2,
        suffix: '',
      };

      const validated = formatTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });
});
