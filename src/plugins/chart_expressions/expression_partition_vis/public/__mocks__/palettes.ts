/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PaletteDefinition, SeriesLayer } from '../../../../charts/public';

export const getPaletteRegistry = () => {
  const colors = [
    '#54B399',
    '#6092C0',
    '#D36086',
    '#9170B8',
    '#CA8EAE',
    '#D6BF57',
    '#B9A888',
    '#DA8B45',
    '#AA6556',
    '#E7664C',
  ];
  let counter = 0;
  const mockPalette: PaletteDefinition = {
    id: 'default',
    title: 'My Palette',
    getCategoricalColor: (_: SeriesLayer[]) => {
      counter++;
      if (counter > colors.length - 1) counter = 0;
      return colors[counter];
    },
    getCategoricalColors: (num: number) => colors,
    toExpression: () => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'system_palette',
          arguments: {
            name: ['default'],
          },
        },
      ],
    }),
  };

  return {
    get: (name: string) => mockPalette,
    getAll: () => [mockPalette],
  };
};

export const palettes = {
  getPalettes: async () => {
    return getPaletteRegistry();
  },
};
