/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PaletteOutput } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/public';
import { computeMinMax } from './helpers';

describe('computeMinMax', () => {
  it('returns the correct min max for percent palette', () => {
    const palette = {
      type: 'palette' as const,
      name: 'custom',
      params: {
        colors: ['#aaa', '#bbb', '#ccc'],
        gradient: false,
        stops: [20, 60, 80],
        range: 'percent',
        rangeMin: 0,
        rangeMax: 100,
      },
    } as PaletteOutput<CustomPaletteState>;
    const bands = [0, 2, 6, 8, 10];
    expect(computeMinMax(palette, bands)).toEqual({ min: 0, max: 10 });
  });

  it('returns the correct min max for percent palette and Infinite bounds', () => {
    const palette = {
      type: 'palette' as const,
      name: 'custom',
      params: {
        colors: ['#aaa', '#bbb', '#ccc'],
        gradient: false,
        stops: [],
        range: 'percent',
        rangeMin: -Infinity,
        rangeMax: Infinity,
      },
    } as PaletteOutput<CustomPaletteState>;
    const bands = [0, 2, 6, 8, 10];
    expect(computeMinMax(palette, bands)).toEqual({ min: 0, max: 10 });
  });

  it('returns the correct min max for number palette', () => {
    const palette = {
      type: 'palette' as const,
      name: 'custom',
      params: {
        colors: ['#aaa', '#bbb', '#ccc'],
        gradient: false,
        stops: [0, 6, 10],
        range: 'number',
        rangeMin: 0,
        rangeMax: 20,
      },
    } as PaletteOutput<CustomPaletteState>;
    const bands = [0, 2, 6, 8, 10];
    expect(computeMinMax(palette, bands)).toEqual({ min: 0, max: 20 });
  });

  it('returns the correct min max for number palette and Infinite bounds', () => {
    const palette = {
      type: 'palette' as const,
      name: 'custom',
      params: {
        colors: ['#aaa', '#bbb', '#ccc'],
        gradient: false,
        stops: [],
        range: 'number',
        rangeMin: -Infinity,
        rangeMax: Infinity,
      },
    } as PaletteOutput<CustomPaletteState>;
    const bands = [0, 2, 6, 8, 10];
    expect(computeMinMax(palette, bands)).toEqual({ min: 0, max: 10 });
  });
});
