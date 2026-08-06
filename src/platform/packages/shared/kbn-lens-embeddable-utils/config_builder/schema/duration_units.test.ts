/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import { durationFormatSchema, legacyDurationFormatSchema } from './duration_units';

type DurationFormat = z.infer<typeof durationFormatSchema>;
type LegacyDurationFormat = z.infer<typeof legacyDurationFormatSchema>;

describe('Duration unit schemas', () => {
  describe('durationFormatSchema (GA)', () => {
    it('validates fine-grained input units', () => {
      const input = {
        type: 'duration',
        from: 'us',
        to: 'auto-approximate',
      } satisfies DurationFormat;

      expect(durationFormatSchema.parse(input)).toEqual(input);
    });

    it('validates minutes with the short form `min`', () => {
      const input = {
        type: 'duration',
        from: 'min',
        to: 'auto',
      } satisfies DurationFormat;

      expect(durationFormatSchema.parse(input)).toEqual(input);
    });

    it('validates standard input and output units', () => {
      const input = {
        type: 'duration',
        from: 'mo',
        to: 'auto',
      } satisfies DurationFormat;

      expect(durationFormatSchema.parse(input)).toEqual(input);
    });

    it('rejects long-form unit names', () => {
      expect(() =>
        durationFormatSchema.parse({ type: 'duration', from: 'seconds', to: 'auto-approximate' })
      ).toThrow();
    });

    it('rejects legacy `m` for minutes', () => {
      expect(() =>
        durationFormatSchema.parse({ type: 'duration', from: 'm', to: 'auto-approximate' })
      ).toThrow();
    });

    it('rejects legacy `humanize` output value', () => {
      expect(() =>
        durationFormatSchema.parse({ type: 'duration', from: 's', to: 'humanize' })
      ).toThrow();
    });

    it('rejects legacy `humanizePrecise` output value', () => {
      expect(() =>
        durationFormatSchema.parse({ type: 'duration', from: 's', to: 'humanizePrecise' })
      ).toThrow();
    });

    it('rejects auto strategies as input units', () => {
      expect(() =>
        durationFormatSchema.parse({ type: 'duration', from: 'auto', to: 's' })
      ).toThrow();
    });
  });

  // Legacy duration units are intentionally free-form strings (no enum validation) to preserve
  // the pre-GA behavior, so nothing is rejected based on the unit name.
  describe('legacyDurationFormatSchema', () => {
    it('validates legacy `m` for minutes', () => {
      const input = {
        type: 'duration',
        from: 'm',
        to: 'humanize',
      } satisfies LegacyDurationFormat;

      expect(legacyDurationFormatSchema.parse(input)).toEqual(input);
    });

    it('validates legacy `humanizePrecise` output', () => {
      const input = {
        type: 'duration',
        from: 'us',
        to: 'humanizePrecise',
      } satisfies LegacyDurationFormat;

      expect(legacyDurationFormatSchema.parse(input)).toEqual(input);
    });

    it('accepts GA unit names without enum validation', () => {
      const input = {
        type: 'duration',
        from: 'min',
        to: 'auto-approximate',
      } satisfies LegacyDurationFormat;

      expect(legacyDurationFormatSchema.parse(input)).toEqual(input);
    });

    it('accepts arbitrary unit strings for backwards compatibility', () => {
      const input = {
        type: 'duration',
        from: 'minutes',
        to: 'anything',
      } satisfies LegacyDurationFormat;

      expect(legacyDurationFormatSchema.parse(input)).toEqual(input);
    });
  });
});
