/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ColorSchemas } from '@kbn/charts-plugin/common';
import { getPercentageModeConfig } from './percentage_mode';
import { ExtendedPaletteParams } from './types';

const params: ExtendedPaletteParams = {
  percentageMode: false,
  colorSchema: ColorSchemas.Greys,
  colorsRange: [
    { type: 'range', from: 0, to: 100 },
    { type: 'range', from: 100, to: 200 },
    { type: 'range', from: 200, to: 300 },
  ],
  invertColors: false,
};

describe('getPercentageModeConfig', () => {
  test('should return falsy percentage mode if percentage mode is off', () => {
    expect(getPercentageModeConfig(params)).toEqual({ isPercentageMode: false });
  });

  test('should return percentage mode config', () => {
    expect(getPercentageModeConfig({ ...params, percentageMode: true })).toEqual({
      isPercentageMode: true,
      min: 0,
      max: 300,
    });
  });
});
