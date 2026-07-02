/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  dslDurationFormatSchema,
  esqlDurationFormatSchema,
  legacyDurationFormatSchema,
} from './duration_units';

describe('Duration unit schemas', () => {
  describe('dslDurationFormatSchema', () => {
    it('validates fine-grained DSL input units', () => {
      const input = {
        type: 'duration' as const,
        from: 'us' as const,
        to: 'auto-approximate' as const,
      };

      expect(dslDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('validates minutes with the new short form `min`', () => {
      const input = {
        type: 'duration' as const,
        from: 'min' as const,
        to: 'auto' as const,
      };

      expect(dslDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('rejects long-form unit names', () => {
      const input = {
        type: 'duration' as const,
        from: 'seconds',
        to: 'auto-approximate',
      };

      expect(() => dslDurationFormatSchema.validate(input)).toThrow();
    });

    it('rejects legacy `m` for minutes', () => {
      const input = {
        type: 'duration' as const,
        from: 'm',
        to: 'auto-approximate',
      };

      expect(() => dslDurationFormatSchema.validate(input)).toThrow();
    });

    it('rejects legacy `humanize` output value', () => {
      const input = {
        type: 'duration' as const,
        from: 's',
        to: 'humanize',
      };

      expect(() => dslDurationFormatSchema.validate(input)).toThrow();
    });

    it('rejects legacy `humanizePrecise` output value', () => {
      const input = {
        type: 'duration' as const,
        from: 's',
        to: 'humanizePrecise',
      };

      expect(() => dslDurationFormatSchema.validate(input)).toThrow();
    });

    it('rejects auto strategies as input units', () => {
      const input = {
        type: 'duration' as const,
        from: 'auto',
        to: 's',
      };

      expect(() => dslDurationFormatSchema.validate(input)).toThrow();
    });
  });

  describe('esqlDurationFormatSchema', () => {
    it('validates ES|QL input units', () => {
      const input = {
        type: 'duration' as const,
        from: 'mo' as const,
        to: 'auto' as const,
      };

      expect(esqlDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('validates `min` as a valid ES|QL input unit', () => {
      const input = {
        type: 'duration' as const,
        from: 'min' as const,
        to: 'auto-approximate' as const,
      };

      expect(esqlDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('rejects fine-grained units not supported by ES|QL', () => {
      const input = {
        type: 'duration' as const,
        from: 'us',
        to: 'ms',
      };

      expect(() => esqlDurationFormatSchema.validate(input)).toThrow();
    });
  });

  describe('legacyDurationFormatSchema', () => {
    it('accepts legacy verbose input unit strings', () => {
      const input = {
        type: 'duration' as const,
        from: 'seconds',
        to: 'humanize',
      };

      expect(legacyDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('accepts legacy `asMinutes` output string', () => {
      const input = {
        type: 'duration' as const,
        from: 'milliseconds',
        to: 'asMinutes',
      };

      expect(legacyDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('accepts legacy `m` for minutes', () => {
      const input = {
        type: 'duration' as const,
        from: 'm',
        to: 'humanizePrecise',
      };

      expect(legacyDurationFormatSchema.validate(input)).toEqual(input);
    });
  });
});
