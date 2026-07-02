/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import {
  dslDurationFormatSchema,
  esqlDurationFormatSchema,
  legacyDurationFormatSchema,
} from './duration_units';

type DslDurationFormat = TypeOf<typeof dslDurationFormatSchema>;
type EsqlDurationFormat = TypeOf<typeof esqlDurationFormatSchema>;
type LegacyDurationFormat = TypeOf<typeof legacyDurationFormatSchema>;

describe('Duration unit schemas', () => {
  describe('dslDurationFormatSchema', () => {
    it('validates fine-grained DSL input units', () => {
      const input = {
        type: 'duration',
        from: 'us',
        to: 'auto-approximate',
      } satisfies DslDurationFormat;

      expect(dslDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('validates minutes with the new short form `min`', () => {
      const input = {
        type: 'duration',
        from: 'min',
        to: 'auto',
      } satisfies DslDurationFormat;

      expect(dslDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('rejects long-form unit names', () => {
      expect(() =>
        dslDurationFormatSchema.validate({ type: 'duration', from: 'seconds', to: 'auto-approximate' })
      ).toThrow();
    });

    it('rejects legacy `m` for minutes', () => {
      expect(() =>
        dslDurationFormatSchema.validate({ type: 'duration', from: 'm', to: 'auto-approximate' })
      ).toThrow();
    });

    it('rejects legacy `humanize` output value', () => {
      expect(() =>
        dslDurationFormatSchema.validate({ type: 'duration', from: 's', to: 'humanize' })
      ).toThrow();
    });

    it('rejects legacy `humanizePrecise` output value', () => {
      expect(() =>
        dslDurationFormatSchema.validate({ type: 'duration', from: 's', to: 'humanizePrecise' })
      ).toThrow();
    });

    it('rejects auto strategies as input units', () => {
      expect(() =>
        dslDurationFormatSchema.validate({ type: 'duration', from: 'auto', to: 's' })
      ).toThrow();
    });
  });

  describe('esqlDurationFormatSchema', () => {
    it('validates ES|QL input units', () => {
      const input = {
        type: 'duration',
        from: 'mo',
        to: 'auto',
      } satisfies EsqlDurationFormat;

      expect(esqlDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('validates `min` as a valid ES|QL input unit', () => {
      const input = {
        type: 'duration',
        from: 'min',
        to: 'auto-approximate',
      } satisfies EsqlDurationFormat;

      expect(esqlDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('rejects fine-grained units not supported by ES|QL', () => {
      expect(() =>
        esqlDurationFormatSchema.validate({ type: 'duration', from: 'us', to: 'ms' })
      ).toThrow();
    });
  });

  describe('legacyDurationFormatSchema', () => {
    it('accepts legacy verbose input unit strings', () => {
      const input = {
        type: 'duration',
        from: 'seconds',
        to: 'humanize',
      } satisfies LegacyDurationFormat;

      expect(legacyDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('accepts legacy `asMinutes` output string', () => {
      const input = {
        type: 'duration',
        from: 'milliseconds',
        to: 'asMinutes',
      } satisfies LegacyDurationFormat;

      expect(legacyDurationFormatSchema.validate(input)).toEqual(input);
    });

    it('accepts legacy `m` for minutes', () => {
      const input = {
        type: 'duration',
        from: 'm',
        to: 'humanizePrecise',
      } satisfies LegacyDurationFormat;

      expect(legacyDurationFormatSchema.validate(input)).toEqual(input);
    });
  });
});
