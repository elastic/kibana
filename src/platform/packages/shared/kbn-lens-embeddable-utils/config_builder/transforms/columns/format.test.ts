/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import type { ValueFormatConfig } from '@kbn/lens-plugin/common';
import type { LensApiMetricOperation } from '../../schema/metric_ops';

describe('Format Transforms', () => {
  describe('fromFormatAPIToLensState', () => {
    it('should handle undefined format', () => {
      expect(fromFormatAPIToLensState(undefined)).toBeUndefined();
    });

    describe('number and percent formats', () => {
      it('should transform number format with defaults', () => {
        const input: LensApiMetricOperation['format'] = {
          type: 'number',
          decimals: 2,
          compact: false,
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'number',
          params: { decimals: 2, compact: false },
        });
      });

      it('should transform percent format with custom decimals', () => {
        const input: LensApiMetricOperation['format'] = {
          type: 'percent',
          decimals: 1,
          compact: false,
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'percent',
          params: { decimals: 1, compact: false },
        });
      });

      it('should include suffix when provided', () => {
        const input: LensApiMetricOperation['format'] = {
          type: 'number',
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
        const input: LensApiMetricOperation['format'] = {
          type: 'number',
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
        const input: LensApiMetricOperation['format'] = {
          type: 'bytes',
          decimals: 1,
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'bytes',
          params: { decimals: 1 },
        });
      });

      it('should transform bits format with suffix', () => {
        const input: LensApiMetricOperation['format'] = {
          type: 'bits',
          suffix: '/s',
          decimals: 2,
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'bits',
          params: { decimals: 2, suffix: '/s' },
        });
      });
    });

    describe('duration format', () => {
      it('should transform duration format', () => {
        const input: LensApiMetricOperation['format'] = {
          type: 'duration',
          from: 'ms',
          to: 's',
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'ms',
            toUnit: 's',
          },
        });
      });

      it('should include suffix in duration format', () => {
        const input: LensApiMetricOperation['format'] = {
          type: 'duration',
          from: 'ms',
          to: 's',
          suffix: ' elapsed',
        };
        expect(fromFormatAPIToLensState(input)).toEqual({
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'ms',
            toUnit: 's',
            suffix: ' elapsed',
          },
        });
      });
    });

    describe('custom format', () => {
      it('should transform custom format', () => {
        const input: LensApiMetricOperation['format'] = {
          type: 'custom',
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
      it('should transform duration format', () => {
        const input: ValueFormatConfig = {
          id: 'duration',
          params: {
            decimals: 2,
            fromUnit: 'ms',
            toUnit: 's',
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
