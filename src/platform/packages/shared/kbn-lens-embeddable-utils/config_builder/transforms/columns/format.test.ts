/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ValueFormatConfig } from '@kbn/lens-common';
import type { LensApiMetricOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';

type ApiFormat = NonNullable<LensApiMetricOperation['format']>;

describe('Format Transforms', () => {
  describe('fromFormatAPIToLensState', () => {
    it('should handle undefined format', () => {
      expect(fromFormatAPIToLensState(undefined)).toBeUndefined();
    });

    describe('number and percent formats', () => {
      it('should transform number format with defaults', () => {
        const input = {
          type: 'number',
          decimals: 2,
          compact: false,
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'number',
          params: { decimals: 2, compact: false },
        });
      });

      it('should transform percent format with custom decimals', () => {
        const input = {
          type: 'percent',
          decimals: 1,
          compact: false,
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'percent',
          params: { decimals: 1, compact: false },
        });
      });

      it('should include suffix when provided', () => {
        const input = {
          type: 'number',
          suffix: ' units',
          decimals: 2,
          compact: false,
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'number',
          params: { decimals: 2, suffix: ' units', compact: false },
        });
      });

      it('should include compact when provided', () => {
        const input = {
          type: 'number',
          compact: true,
          decimals: 2,
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'number',
          params: { decimals: 2, compact: true },
        });
      });
    });

    describe('bytes and bits formats', () => {
      it('should transform bytes format', () => {
        const input = {
          type: 'bytes',
          decimals: 1,
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'bytes',
          params: { decimals: 1 },
        });
      });

      it('should transform bits format with suffix', () => {
        const input = {
          type: 'bits',
          suffix: '/s',
          decimals: 2,
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'bits',
          params: { decimals: 2, suffix: '/s' },
        });
      });
    });

    describe('duration format — GA enums', () => {
      it('should transform duration format with short units', () => {
        const input = {
          type: 'duration',
          from: 'ms',
          to: 's',
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'milliseconds',
            toUnit: 'asSeconds',
          },
        });
      });

      it('should include suffix in duration format', () => {
        const input = {
          type: 'duration',
          from: 'ms',
          to: 's',
          suffix: ' elapsed',
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'milliseconds',
            toUnit: 'asSeconds',
            suffix: ' elapsed',
          },
        });
      });

      it('should transform `auto-approximate` to humanize Lens state', () => {
        const input = {
          type: 'duration',
          from: 's',
          to: 'auto-approximate',
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'seconds',
            toUnit: 'humanize',
          },
        });
      });

      it('should transform `auto` to humanizePrecise Lens state', () => {
        const input = {
          type: 'duration',
          from: 'ms',
          to: 'auto',
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'milliseconds',
            toUnit: 'humanizePrecise',
          },
        });
      });

      it('should transform `min` input unit', () => {
        const input = {
          type: 'duration',
          from: 'min',
          to: 'auto-approximate',
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'minutes',
            toUnit: 'humanize',
          },
        });
      });

      it('should transform fine-grained DSL input units', () => {
        const input = {
          type: 'duration',
          from: 'us',
          to: 'ms',
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'microseconds',
            toUnit: 'asMilliseconds',
          },
        });
      });
    });

    describe('duration format — legacy unit names', () => {
      it('should map legacy `m` input unit to `minutes` Lens state', () => {
        const input = {
          type: 'duration',
          from: 'm',
          to: 'humanize',
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'minutes',
            toUnit: 'humanize',
          },
        });
      });

      it('should map legacy `humanizePrecise` output to Lens state', () => {
        const input = {
          type: 'duration',
          from: 'ms',
          to: 'humanizePrecise',
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'milliseconds',
            toUnit: 'humanizePrecise',
          },
        });
      });

      it('should map legacy `m` output unit to `asMinutes` Lens state', () => {
        const input = {
          type: 'duration',
          from: 'ms',
          to: 'm',
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'milliseconds',
            toUnit: 'asMinutes',
          },
        });
      });
    });

    describe('custom format', () => {
      it('should transform custom format', () => {
        const input = {
          type: 'custom',
          pattern: '$0,0.00',
        } satisfies ApiFormat;
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'custom',
          params: {
            decimals: 2,
            pattern: '$0,0.00',
          },
        });
      });
    });
  });

  describe('fromFormatLensStateToAPI', () => {
    it('should handle undefined format', () => {
      expect(fromFormatLensStateToAPI(undefined)).toBeUndefined();
    });

    describe('number and percent formats', () => {
      it('should transform number format', () => {
        const input = {
          id: 'number',
          params: { decimals: 3 },
        } satisfies ValueFormatConfig;
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'number',
          decimals: 3,
        });
      });

      it('should omit default decimals', () => {
        const input = {
          id: 'number',
          params: { decimals: 2 },
        } satisfies ValueFormatConfig;
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'number',
          decimals: 2,
        });
      });

      it('should include suffix and compact', () => {
        const input = {
          id: 'percent',
          params: { decimals: 1, suffix: '%', compact: true },
        } satisfies ValueFormatConfig;
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'percent',
          decimals: 1,
          suffix: '%',
          compact: true,
        });
      });
    });

    describe('bytes and bits formats', () => {
      it('should transform bytes format', () => {
        const input = {
          id: 'bytes',
          params: { decimals: 1, suffix: '/s' },
        } satisfies ValueFormatConfig;
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'bytes',
          decimals: 1,
          suffix: '/s',
        });
      });
    });

    describe('duration format', () => {
      it('should transform duration format to GA enum names', () => {
        const input = {
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'milliseconds',
            toUnit: 'asSeconds',
            suffix: ' elapsed',
          },
        } satisfies ValueFormatConfig;
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 'ms',
          to: 's',
          suffix: ' elapsed',
        });
      });

      it('should apply defaults when duration units are missing', () => {
        const input = {
          id: 'duration',
          params: {
            decimals: 0,
            compact: true,
          },
        } satisfies ValueFormatConfig;
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 's',
          to: 'auto-approximate',
        });
      });

      it('should convert Lens `humanize` state to `auto-approximate`', () => {
        const input = {
          id: 'duration',
          params: {
            decimals: 0,
            compact: true,
            fromUnit: 'seconds',
            toUnit: 'humanize',
          },
        } satisfies ValueFormatConfig;
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 's',
          to: 'auto-approximate',
        });
      });

      it('should convert Lens `humanizePrecise` state to `auto`', () => {
        const input = {
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'milliseconds',
            toUnit: 'humanizePrecise',
          },
        } satisfies ValueFormatConfig;
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 'ms',
          to: 'auto',
        });
      });

      it('should convert Lens `asMinutes` state to `min`', () => {
        const input = {
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'minutes',
            toUnit: 'asMinutes',
          },
        } satisfies ValueFormatConfig;
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 'min',
          to: 'min',
        });
      });

      it('should apply default from unit when only to unit is set', () => {
        const input = {
          id: 'duration',
          params: {
            decimals: 0,
            toUnit: 'humanizePrecise',
          },
        } satisfies ValueFormatConfig;
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 's',
          to: 'auto',
        });
      });

      it('should round-trip GA duration formats', () => {
        const apiFormat = {
          type: 'duration',
          from: 's',
          to: 'auto',
        } satisfies ApiFormat;
        const lensFormat = fromFormatAPIToLensState(apiFormat);
        expect(fromFormatLensStateToAPI(lensFormat)).toEqual(apiFormat);
      });

      it('should normalize legacy input to GA output on round-trip', () => {
        // Legacy input uses pre-GA names; output always uses GA enum names
        const legacyApiFormat = {
          type: 'duration',
          from: 'm',
          to: 'humanize',
        } satisfies ApiFormat;
        const lensFormat = fromFormatAPIToLensState(legacyApiFormat);
        expect(fromFormatLensStateToAPI(lensFormat)).toEqual({
          type: 'duration',
          from: 'min',
          to: 'auto-approximate',
        });
      });
    });

    describe('custom format', () => {
      it('should transform custom format', () => {
        const input = {
          id: 'custom',
          params: {
            decimals: 2,
            pattern: '$0,0.00',
          },
        } satisfies ValueFormatConfig;
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'custom',
          pattern: '$0,0.00',
        });
      });
    });
  });
});
