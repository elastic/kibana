/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IKbnPalette, KbnPalette, getKbnPalettes } from '@kbn/palettes';

import { ColorMapping, DEFAULT_COLOR_MAPPING_CONFIG } from '../../shared_components';
import { getConfigFromPalette } from './get_config_from_palette';

const palettes = getKbnPalettes({ name: 'borealis', darkMode: false });

describe('getConfigFromPalette', () => {
  describe('categorical', () => {
    it('should return default color mapping with old id', () => {
      const result = getConfigFromPalette(palettes, KbnPalette.Default);

      expect(result.paletteId).toBe(KbnPalette.Default);
      expect(result).toMatchObject(DEFAULT_COLOR_MAPPING_CONFIG);
    });
  });

  describe('gradient', () => {
    const commonStep: ColorMapping.ColorStep = {
      touched: false,
      paletteId: KbnPalette.Default,
      type: 'categorical' as const,
      colorIndex: 0,
    };

    describe('single-color gradients', () => {
      const gradientPalettes = [
        {
          id: KbnPalette.Cool,
          steps: [{ ...commonStep, colorIndex: 2 }],
        },
        {
          id: KbnPalette.Gray,
          steps: [{ touched: false, type: 'colorCode' as const, colorCode: '#1d2a3e' }],
        },
        {
          id: KbnPalette.Red,
          steps: [{ ...commonStep, colorIndex: 6 }],
        },
        {
          id: KbnPalette.Green,
          steps: [{ touched: false, type: 'colorCode' as const, colorCode: '#24c292' }],
        },
        {
          id: KbnPalette.Warm,
          steps: [{ ...commonStep, colorIndex: 6 }],
        },
      ].map<[id: string, palette: IKbnPalette, steps: ColorMapping.ColorStep[]]>(
        ({ id, steps }) => [id, palettes.get(id), steps]
      );

      it.each(gradientPalettes)(
        'should return gradient color mapping for %j palette',
        (_, palette, steps) => {
          const result = getConfigFromPalette(palettes, palette.id);

          expect(result.paletteId).toBe(KbnPalette.Default);

          const colorMode = result.colorMode as ColorMapping.GradientColorMode;
          expect(colorMode.type).toBe('gradient');
          expect(colorMode.sort).toBe('asc');
          expect(colorMode.steps).toHaveLength(1);
          expect(colorMode.steps).toEqual(steps);
        }
      );
    });

    describe('multi-color gradients', () => {
      const gradientPalettes = [
        {
          id: KbnPalette.Temperature,
          steps: [
            { ...commonStep, colorIndex: 6 },
            { touched: false, type: 'colorCode' as const, colorCode: '#ebeff5' },
            { ...commonStep, colorIndex: 2 },
          ],
        },
        {
          id: KbnPalette.Complementary,
          steps: [
            { ...commonStep, colorIndex: 8 },
            { touched: false, type: 'colorCode' as const, colorCode: '#f6f9fc' },
            { ...commonStep, colorIndex: 2 },
          ],
        },
        {
          id: KbnPalette.Status,
          steps: [
            { ...commonStep, colorIndex: 6 },
            { ...commonStep, colorIndex: 9 },
            { touched: false, type: 'colorCode' as const, colorCode: '#24c292' },
          ],
        },
      ].map<[id: string, palette: IKbnPalette, steps: ColorMapping.GradientColorMode['steps']]>(
        ({ id, steps }) => [id, palettes.get(id), steps]
      );

      it.each(gradientPalettes)(
        'should return gradient color mapping for %j palette',
        (_, palette, steps) => {
          const result = getConfigFromPalette(palettes, palette.id);

          expect(result.paletteId).toBe(KbnPalette.Default);

          const colorMode = result.colorMode as ColorMapping.GradientColorMode;
          expect(colorMode.type).toBe('gradient');
          expect(colorMode.sort).toBe('asc');
          expect(colorMode.steps).toHaveLength(3);
          expect(colorMode.steps).toEqual(steps);
        }
      );
    });
  });
});
