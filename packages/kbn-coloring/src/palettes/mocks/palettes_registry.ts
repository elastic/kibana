/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteDefinition, SeriesLayer } from '../types';

export const getPaletteRegistry = () => {
  const mockPalette1: jest.Mocked<PaletteDefinition> = {
    id: 'default',
    title: 'My Palette',
    getCategoricalColor: jest.fn((_: SeriesLayer[]) => 'black'),
    getCategoricalColors: jest.fn((num: number) => ['red', 'black']),
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
    getCategoricalColor: jest.fn((_: SeriesLayer[]) => 'blue'),
    getCategoricalColors: jest.fn((num: number) => ['blue', 'yellow']),
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

  const mockPalette3: jest.Mocked<PaletteDefinition> = {
    id: 'custom',
    title: 'Custom Mocked Palette',
    getCategoricalColor: jest.fn((_: SeriesLayer[]) => 'blue'),
    getCategoricalColors: jest.fn((num: number) => ['blue', 'yellow']),
    getColorForValue: jest.fn(
      (num: number | undefined, state: unknown, minMax: { min: number; max: number }) =>
        num == null || num < 1 ? undefined : 'blue'
    ),
    canDynamicColoring: true,
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
    get: (name: string) =>
      name === 'custom' ? mockPalette3 : name !== 'default' ? mockPalette2 : mockPalette1,
    getAll: () => [mockPalette1, mockPalette2, mockPalette3],
  };
};
