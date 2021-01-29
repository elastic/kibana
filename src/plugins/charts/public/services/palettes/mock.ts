/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { PaletteService } from './service';
import { PaletteDefinition, SeriesLayer } from './types';

export const getPaletteRegistry = () => {
  const mockPalette1: jest.Mocked<PaletteDefinition> = {
    id: 'default',
    title: 'My Palette',
    getColor: jest.fn((_: SeriesLayer[]) => 'black'),
    getColors: jest.fn((num: number) => ['red', 'black']),
    toExpression: jest.fn(() => ({
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
    })),
  };

  const mockPalette2: jest.Mocked<PaletteDefinition> = {
    id: 'mocked',
    title: 'Mocked Palette',
    getColor: jest.fn((_: SeriesLayer[]) => 'blue'),
    getColors: jest.fn((num: number) => ['blue', 'yellow']),
    toExpression: jest.fn(() => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'system_palette',
          arguments: {
            name: ['mocked'],
          },
        },
      ],
    })),
  };

  return {
    get: (name: string) => (name !== 'default' ? mockPalette2 : mockPalette1),
    getAll: () => [mockPalette1, mockPalette2],
  };
};

export const paletteServiceMock: PublicMethodsOf<PaletteService> = {
  setup() {
    return {
      getPalettes: async () => {
        return getPaletteRegistry();
      },
    };
  },
};
