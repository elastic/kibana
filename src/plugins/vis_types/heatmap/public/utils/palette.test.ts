/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Range } from '@kbn/expressions-plugin';
import type { ColorSchemas } from '@kbn/charts-plugin/common';
import { getStopsWithColorsFromRanges, getStopsWithColorsFromColorsNumber } from './palette';

describe('getFilterClickData', () => {
  const ranges = [
    {
      from: 0,
      to: 1,
    },
    {
      from: 1,
      to: 2,
    },
    {
      from: 2,
      to: 3,
    },
    {
      from: 3,
      to: 4,
    },
    {
      from: 4,
      to: 5,
    },
  ] as Range[];
  it('generates the correct config for given ranges', () => {
    const paletteConfig = getStopsWithColorsFromRanges(ranges, 'Blues' as ColorSchemas, false);
    expect(paletteConfig.stop.length).toEqual(ranges.length);
    expect(paletteConfig).toEqual({
      color: [
        'rgb(247,251,255)',
        'rgb(207,225,242)',
        'rgb(146,195,223)',
        'rgb(75,151,201)',
        'rgb(23,100,171)',
      ],
      stop: [1, 2, 3, 4, 5],
    });
  });

  it('generates the correct config for given ranges and invertColors true', () => {
    const paletteConfig = getStopsWithColorsFromRanges(ranges, 'Blues' as ColorSchemas, true);
    expect(paletteConfig).toEqual({
      color: [
        'rgb(8,48,107)',
        'rgb(23,100,171)',
        'rgb(75,151,201)',
        'rgb(146,195,223)',
        'rgb(207,225,242)',
      ],
      stop: [1, 2, 3, 4, 5],
    });
  });
});

describe('getStopsWithColorsFromColorsNumber', () => {
  it('generates the correct config for given number of dynamic ranges', () => {
    const colorsNumber = 5;
    const paletteConfig = getStopsWithColorsFromColorsNumber(
      colorsNumber,
      'Blues' as ColorSchemas,
      false
    );
    expect(paletteConfig?.stop?.length).toEqual(colorsNumber);
    expect(paletteConfig).toEqual({
      color: [
        'rgb(247,251,255)',
        'rgb(207,225,242)',
        'rgb(146,195,223)',
        'rgb(75,151,201)',
        'rgb(23,100,171)',
      ],
      stop: [20, 40, 60, 80, 100],
    });
  });

  it('generates the correct config for given number of dynamic ranges and invertColors true', () => {
    const colorsNumber = 5;
    const paletteConfig = getStopsWithColorsFromColorsNumber(
      colorsNumber,
      'Blues' as ColorSchemas,
      true
    );
    expect(paletteConfig).toEqual({
      color: [
        'rgb(8,48,107)',
        'rgb(23,100,171)',
        'rgb(75,151,201)',
        'rgb(146,195,223)',
        'rgb(207,225,242)',
      ],
      stop: [20, 40, 60, 80, 100],
    });
  });
});
