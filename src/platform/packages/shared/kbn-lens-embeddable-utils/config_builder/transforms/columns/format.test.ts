/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import type { ValueFormatConfig } from '@kbn/lens-common';

describe('Format Transforms', () => {
  describe('fromFormatAPIToLensState', () => {
    it('should handle undefined format', () => {
      expect(fromFormatAPIToLensState(undefined)).toBeUndefined();
    });

    describe('number and percent formats', () => {
      it('should transform number format with defaults', () => {
        const input = {
          type: 'number' as const,
          decimals: 2,
          compact: false,
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'number',
          params: { decimals: 2, compact: false },
        });
      });

      it('should transform percent format with custom decimals', () => {
        const input = {
          type: 'percent' as const,
          decimals: 1,
          compact: false,
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'percent',
          params: { decimals: 1, compact: false },
        });
      });

      it('should include suffix when provided', () => {
        const input = {
          type: 'number' as const,
          suffix: ' units',
          decimals: 2,
          compact: false,
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'number',
          params: { decimals: 2, suffix: ' units', compact: false },
        });
      });

      it('should include compact when provided', () => {
        const input = {
          type: 'number' as const,
          compact: true,
          decimals: 2,
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'number',
          params: { decimals: 2, compact: true },
        });
      });
    });

    describe('bytes and bits formats', () => {
      it('should transform bytes format', () => {
        const input = {
          type: 'bytes' as const,
          decimals: 1,
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'bytes',
          params: { decimals: 1 },
        });
      });

      it('should transform bits format with suffix', () => {
        const input = {
          type: 'bits' as const,
          suffix: '/s',
          decimals: 2,
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'bits',
          params: { decimals: 2, suffix: '/s' },
        });
      });
    });

    describe('duration format — GA enums', () => {
      it('should transform duration format with short units', () => {
        const input = {
          type: 'duration' as const,
          from: 'ms' as const,
          to: 's' as const,
        };
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
          type: 'duration' as const,
          from: 'ms' as const,
          to: 's' as const,
          suffix: ' elapsed',
        };
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
          type: 'duration' as const,
          from: 's' as const,
          to: 'auto-approximate' as const,
        };
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
          type: 'duration' as const,
          from: 'ms' as const,
          to: 'auto' as const,
        };
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
          type: 'duration' as const,
          from: 'min' as const,
          to: 'auto-approximate' as const,
        };
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
          type: 'duration' as const,
          from: 'us' as const,
          to: 'ms' as const,
        };
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

    describe('duration format — legacy strings (backward compat)', () => {
      it('should pass through legacy verbose from unit', () => {
        const input = {
          type: 'duration' as const,
          from: 'seconds',
          to: 'humanize',
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'seconds',
            toUnit: 'humanize',
          },
        });
      });

      it('should pass through legacy `asMinutes` to unit', () => {
        const input = {
          type: 'duration' as const,
          from: 'milliseconds',
          to: 'asMinutes',
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'milliseconds',
            toUnit: 'asMinutes',
          },
        });
      });

      it('should pass through legacy `m` for minutes', () => {
        const input = {
          type: 'duration' as const,
          from: 'm',
          to: 'humanizePrecise',
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'm',
            toUnit: 'humanizePrecise',
          },
        });
      });
    });

    describe('custom format', () => {
      it('should transform custom format', () => {
        const input = {
          type: 'custom' as const,
          pattern: '$0,0.00',
        };
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
        const input: ValueFormatConfig = {
          id: 'number',
          params: { decimals: 3 },
        };
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'number',
          decimals: 3,
        });
      });

      it('should omit default decimals', () => {
        const input: ValueFormatConfig = {
          id: 'number',
          params: { decimals: 2 },
        };
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'number',
          decimals: 2,
        });
      });

      it('should include suffix and compact', () => {
        const input: ValueFormatConfig = {
          id: 'percent',
          params: { decimals: 1, suffix: '%', compact: true },
        };
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
        const input: ValueFormatConfig = {
          id: 'bytes',
          params: { decimals: 1, suffix: '/s' },
        };
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'bytes',
          decimals: 1,
          suffix: '/s',
        });
      });
    });

    describe('duration format', () => {
      it('should transform duration format to GA enum names', () => {
        const input: ValueFormatConfig = {
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'milliseconds',
            toUnit: 'asSeconds',
            suffix: ' elapsed',
          },
        };
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 'ms',
          to: 's',
          suffix: ' elapsed',
        });
      });

      it('should apply defaults when duration units are missing', () => {
        const input: ValueFormatConfig = {
          id: 'duration',
          params: {
            decimals: 0,
            compact: true,
          },
        };
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 's',
          to: 'auto-approximate',
        });
      });

      it('should convert Lens `humanize` state to `auto-approximate`', () => {
        const input: ValueFormatConfig = {
          id: 'duration',
          params: {
            decimals: 0,
            compact: true,
            fromUnit: 'seconds',
            toUnit: 'humanize',
          },
        };
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 's',
          to: 'auto-approximate',
        });
      });

      it('should convert Lens `humanizePrecise` state to `auto`', () => {
        const input: ValueFormatConfig = {
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'milliseconds',
            toUnit: 'humanizePrecise',
          },
        };
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 'ms',
          to: 'auto',
        });
      });

      it('should convert Lens `asMinutes` state to `min`', () => {
        const input: ValueFormatConfig = {
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'minutes',
            toUnit: 'asMinutes',
          },
        };
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 'min',
          to: 'min',
        });
      });

      it('should apply default from unit when only to unit is set', () => {
        const input: ValueFormatConfig = {
          id: 'duration',
          params: {
            decimals: 0,
            toUnit: 'humanizePrecise',
          },
        };
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'duration',
          from: 's',
          to: 'auto',
        });
      });

      it('should round-trip GA duration formats', () => {
        const apiFormat = {
          type: 'duration' as const,
          from: 's' as const,
          to: 'auto' as const,
        };
        const lensFormat = fromFormatAPIToLensState(apiFormat);
        expect(fromFormatLensStateToAPI(lensFormat)).toEqual(apiFormat);
      });

      it('should normalize legacy input to GA output on round-trip', () => {
        // Legacy input uses verbose string; output always uses GA enum names
        const legacyApiFormat = {
          type: 'duration' as const,
          from: 'seconds',
          to: 'humanize',
        };
        const lensFormat = fromFormatAPIToLensState(legacyApiFormat);
        expect(fromFormatLensStateToAPI(lensFormat)).toEqual({
          type: 'duration',
          from: 's',
          to: 'auto-approximate',
        });
      });
    });

    describe('custom format', () => {
      it('should transform custom format', () => {
        const input: ValueFormatConfig = {
          id: 'custom',
          params: {
            decimals: 2,
            pattern: '$0,0.00',
          },
        };
        expect(fromFormatLensStateToAPI(input)).toEqual({
          type: 'custom',
          pattern: '$0,0.00',
        });
      });
    });
  });
});
