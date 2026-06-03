/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';

// These mocks are to test that existing SO state last stop is transformed correctly to the rangeMax.

export const noLimitPalette: PaletteOutput<CustomPaletteParams> = {
  name: 'custom',
  type: 'palette',
  params: {
    steps: 3,
    name: 'custom',
    reverse: false,
    rangeType: 'percent',
    // @ts-expect-error - This can be null
    rangeMin: null,
    // @ts-expect-error - This can be null
    rangeMax: null,
    progression: 'fixed',
    stops: [
      {
        color: '#24c292',
        stop: 33.32,
      },
      {
        color: '#fcd883',
        stop: 66.65,
      },
      {
        color: '#f6726a',
        stop: 100, // this should be null
      },
    ],
    colorStops: [
      {
        color: '#24c292',
        // @ts-expect-error - This can be null
        stop: null,
      },
      {
        color: '#fcd883',
        stop: 33.32,
      },
      {
        color: '#f6726a',
        stop: 66.65,
      },
    ],
    continuity: 'all',
    maxSteps: 5,
  },
};

export const lowerLimitPalette: PaletteOutput<CustomPaletteParams> = {
  name: 'custom',
  type: 'palette',
  params: {
    steps: 3,
    name: 'custom',
    reverse: false,
    rangeType: 'percent',
    rangeMin: 0,
    // @ts-expect-error - This can be null
    rangeMax: null,
    progression: 'fixed',
    stops: [
      {
        color: '#24c292',
        stop: 33.32,
      },
      {
        color: '#fcd883',
        stop: 66.65,
      },
      {
        color: '#f6726a',
        stop: 100, // this should be null
      },
    ],
    colorStops: [
      {
        color: '#24c292',
        stop: 0,
      },
      {
        color: '#fcd883',
        stop: 33.32,
      },
      {
        color: '#f6726a',
        stop: 66.65,
      },
    ],
    continuity: 'above',
    maxSteps: 5,
  },
};

export const upperAndLowerLimitPalette: PaletteOutput<CustomPaletteParams> = {
  name: 'custom',
  type: 'palette',
  params: {
    steps: 3,
    name: 'custom',
    reverse: false,
    rangeType: 'number',
    rangeMin: 300,
    rangeMax: 700,
    progression: 'fixed',
    stops: [
      {
        color: '#24c292',
        stop: 424.65,
      },
      {
        color: '#fcd883',
        stop: 541.29,
      },
      {
        color: '#f6726a',
        stop: 658, // this should be 700
      },
    ],
    colorStops: [
      {
        color: '#24c292',
        stop: 300,
      },
      {
        color: '#fcd883',
        stop: 424.65,
      },
      {
        color: '#f6726a',
        stop: 541.29,
      },
    ],
    continuity: 'none',
    maxSteps: 5,
  },
};
