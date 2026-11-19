/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricUnit } from '../../../types';
import { getLensMetricFormat, durationUnitNames } from './get_lens_metric_format';

describe('getLensMetricFormat', () => {
  describe('handles count and unit-less metrics', () => {
    it.each([undefined, 'count', '{operations}'] as const)(
      'formats %s as a compact-compatible whole number',
      (unit) => {
        expect(getLensMetricFormat(unit)).toEqual({
          format: 'number',
          decimals: 0,
        });
      }
    );

    it('returns undefined for an unknown unit', () => {
      expect(getLensMetricFormat('Hz' as MetricUnit)).toBeUndefined();
    });
  });

  describe('handles units correctly', () => {
    const durationUnits: Array<keyof typeof durationUnitNames> = [
      'ns',
      'us',
      'ms',
      's',
      'm',
      'h',
      'd',
    ];

    durationUnits.forEach((unit) => {
      it(`formats ${unit} as duration correctly`, () => {
        const result = getLensMetricFormat(unit);

        expect(result).toEqual({
          format: 'duration',
          fromUnit: durationUnitNames[unit],
          toUnit: 'humanizePrecise',
          decimals: 0,
        });
      });
    });

    const percentAndBytesUnits = [
      {
        unit: 'percent' as const,
        expected: {
          format: 'percent',
          decimals: 1,
        },
      },
      {
        unit: 'bytes' as const,
        expected: {
          format: 'bytes',
          decimals: 1,
        },
      },
    ];

    percentAndBytesUnits.forEach(({ unit, expected }) => {
      it(`handles ${unit} unit correctly`, () => {
        const result = getLensMetricFormat(unit);
        expect(result).toEqual(expected);
      });
    });
  });
});
