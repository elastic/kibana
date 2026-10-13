/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricUnit } from '../../../types';
import { getHeatmapValueFormat } from './get_heatmap_value_format';

describe('getHeatmapValueFormat', () => {
  it.each([undefined, 'count', '{operations}'] as const)('formats %s as a whole number', (unit) => {
    expect(getHeatmapValueFormat(unit)).toEqual({ type: 'number', decimals: 0, compact: false });
  });

  it('formats percent, bytes, and bits', () => {
    expect(getHeatmapValueFormat('percent')).toEqual({
      type: 'percent',
      decimals: 1,
      compact: false,
    });
    expect(getHeatmapValueFormat('bytes')).toEqual({ type: 'bytes', decimals: 1 });
    expect(getHeatmapValueFormat('bits')).toEqual({ type: 'bits', decimals: 1 });
  });

  it.each(['ns', 'us', 'ms', 's', 'h', 'd'] as const)(
    'formats %s as a duration that humanizes precisely',
    (unit) => {
      expect(getHeatmapValueFormat(unit)).toEqual({
        type: 'duration',
        from: unit,
        to: 'auto',
        decimals: 0,
      });
    }
  );

  it('maps minutes to the API unit', () => {
    expect(getHeatmapValueFormat('m')).toEqual({
      type: 'duration',
      from: 'min',
      to: 'auto',
      decimals: 0,
    });
  });

  it('leaves an unknown unit unformatted', () => {
    expect(getHeatmapValueFormat('Hz' as MetricUnit)).toBeUndefined();
  });
});
