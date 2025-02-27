/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ColorSchemas } from '@kbn/charts-plugin/common';
import { getPalette } from './palette';
import { PaletteParams } from './types';

describe('getPalette', () => {
  const params: PaletteParams = {
    colorSchema: ColorSchemas.Greys,
    colorsRange: [
      { type: 'range', from: 0, to: 100 },
      { type: 'range', from: 100, to: 200 },
      { type: 'range', from: 200, to: 300 },
    ],
    invertColors: false,
  };

  test('should return undefined if empty color ranges were passed', () => {
    const paramsWithNoneMetricColorMode: PaletteParams = {
      ...params,
      colorsRange: [],
    };
    expect(getPalette(paramsWithNoneMetricColorMode, { isPercentageMode: false })).toBeUndefined();
  });

  test('should return correct palette for percentage mode', () => {
    expect(getPalette(params, { isPercentageMode: true, min: 0, max: 300 })).toEqual({
      name: 'custom',
      params: {
        colorStops: [
          { color: '#FFFFFF', stop: 0 },
          { color: '#979797', stop: 0.3333333333333333 },
          { color: '#000000', stop: 0.6666666666666666 },
        ],
        continuity: 'none',
        maxSteps: 5,
        name: 'custom',
        progression: 'fixed',
        rangeMax: 1,
        rangeMin: 0,
        rangeType: 'number',
        reverse: false,
        stops: [
          { color: '#FFFFFF', stop: 0.3333333333333333 },
          { color: '#979797', stop: 0.6666666666666666 },
          { color: '#000000', stop: 1 },
        ],
      },
      type: 'palette',
    });
  });

  test('should return correct palette for percentage mode with percent range type', () => {
    expect(getPalette(params, { isPercentageMode: true, min: 0, max: 300 }, true)).toEqual({
      name: 'custom',
      params: {
        colorStops: [
          { color: '#FFFFFF', stop: 0 },
          { color: '#979797', stop: 33.33333333333333 },
          { color: '#000000', stop: 66.66666666666666 },
        ],
        continuity: 'none',
        maxSteps: 5,
        name: 'custom',
        progression: 'fixed',
        rangeMax: 100,
        rangeMin: 0,
        rangeType: 'percent',
        reverse: false,
        stops: [
          { color: '#FFFFFF', stop: 33.33333333333333 },
          { color: '#979797', stop: 66.66666666666666 },
          { color: '#000000', stop: 100 },
        ],
      },
      type: 'palette',
    });
  });

  test('should return correct palette', () => {
    expect(getPalette(params, { isPercentageMode: false, min: 0, max: 300 })).toEqual({
      name: 'custom',
      params: {
        colorStops: [
          { color: '#FFFFFF', stop: 0 },
          { color: '#979797', stop: 100 },
          { color: '#000000', stop: 200 },
        ],
        continuity: 'none',
        maxSteps: 5,
        name: 'custom',
        progression: 'fixed',
        rangeMax: 300,
        rangeMin: 0,
        rangeType: 'number',
        reverse: false,
        stops: [
          { color: '#FFFFFF', stop: 100 },
          { color: '#979797', stop: 200 },
          { color: '#000000', stop: 300 },
        ],
      },
      type: 'palette',
    });
  });
});
