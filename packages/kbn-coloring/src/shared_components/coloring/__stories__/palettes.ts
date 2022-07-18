/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteDefinition, SeriesLayer } from '../../../palettes/types';

const getMockedPalette = (
  id: string,
  title: string,
  colors: string[],
  canDynamicColoring: boolean = true
): PaletteDefinition => {
  let counter = 0;
  return {
    id,
    title,
    getCategoricalColor: (_: SeriesLayer[]) => {
      counter++;
      if (counter > colors.length - 1) counter = 0;
      return colors[counter];
    },
    canDynamicColoring,
    internal: true,
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
};

export const getPaletteRegistry = () => {
  const getMockedPalettes = (): Record<string, PaletteDefinition> => ({
    default: getMockedPalette('default', 'Default Palette', [
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
    ]),
    positive: getMockedPalette('positive', 'Grey Palette', [
      '#222',
      '#333',
      '#444',
      '#555',
      '#666',
      '#777',
      '#888',
      '#999',
      '#AAA',
      '#BBB',
    ]),
    foo: getMockedPalette('foo', 'Foo Palette', [
      '#7E7',
      '#7D7',
      '#7A7',
      '#797',
      '#787',
      '#777',
      '#767',
      '#757',
      '#747',
      '#737',
    ]),
    custom: getMockedPalette('custom', 'Custom Palette', [], false),
  });

  return {
    get: (name: string) => getMockedPalettes()[name],
    getAll: () => Object.values(getMockedPalettes()),
  };
};

export const palettes = {
  getPalettes: async () => {
    return getPaletteRegistry();
  },
};
