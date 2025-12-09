/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';

export const noLimitPalette: PaletteOutput<CustomPaletteParams> = {
  name: 'custom',
  type: 'palette',
  params: {
    steps: 3,
    name: 'custom',
    reverse: false,
    rangeType: 'number',
    // @ts-expect-error - This can be null
    rangeMin: null,
    // @ts-expect-error - This can be null
    rangeMax: null,
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
        // @ts-expect-error - This can be null
        stop: null,
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
        stop: 424.65,
      },
      {
        color: '#f6726a',
        stop: 541.29,
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
    rangeType: 'number',
    rangeMin: 300,
    // @ts-expect-error - This can be null
    rangeMax: null,
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
        // @ts-expect-error - This can be null
        stop: null,
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
    continuity: 'above',
    maxSteps: 5,
  },
};

export const upperLimitPalette: PaletteOutput<CustomPaletteParams> = {
  name: 'custom',
  type: 'palette',
  params: {
    steps: 3,
    name: 'custom',
    reverse: false,
    rangeType: 'number',
    // @ts-expect-error - This can be null
    rangeMin: null,
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
        stop: 700,
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
        stop: 424.65,
      },
      {
        color: '#f6726a',
        stop: 541.29,
      },
    ],
    continuity: 'below',
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
        stop: 700,
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
