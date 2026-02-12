/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorMapping, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';

import type { ColorByValueType, ColorMappingType, StaticColorType } from '../../schema/color';
import {
  fromColorByValueAPIToLensState,
  fromColorByValueLensStateToAPI,
  fromStaticColorLensStateToAPI,
  fromStaticColorAPIToLensState,
  fromColorMappingAPIToLensState,
  fromColorMappingLensStateToAPI,
} from './coloring';

import * as percentageMocks from './percentage.mocks';
import * as absoluteMocks from './absolute.mocks';
import * as badMaxStepsMocks from './bad_max_step.mocks';

describe('Color util transforms', () => {
  describe('fromColorByValueAPIToLensState', () => {
    it('should return undefined when color is undefined', () => {
      expect(fromColorByValueAPIToLensState(undefined)).toBeUndefined();
    });

    it('should convert absolute range color steps', () => {
      const colorByValue: ColorByValueType = {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { color: 'red', lt: 0 },
          { color: 'green', gte: 0, lt: 100 },
          { color: 'blue', gte: 100 },
        ],
      };

      const result = fromColorByValueAPIToLensState(colorByValue);

      expect(result).toEqual({
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          rangeType: 'number',
          progression: 'fixed',
          continuity: 'all',
          reverse: false,
          steps: 3,
          maxSteps: 5,
          // @ts-expect-error - This can be null
          rangeMax: null,
          // @ts-expect-error - This can be null
          rangeMin: null,
          stops: [
            { color: 'red', stop: 0 },
            { color: 'green', stop: 100 },
            // @ts-expect-error - This can be null
            { color: 'blue', stop: null },
          ],
          colorStops: [
            // @ts-expect-error - This can be null
            { color: 'red', stop: null },
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 100 },
          ],
        },
      } satisfies PaletteOutput<CustomPaletteParams>);
    });

    it('should convert percentage range color with min/max values', () => {
      const colorByValue: ColorByValueType = {
        type: 'dynamic',
        range: 'percentage',
        steps: [
          { color: 'red', gte: 10, lt: 50 },
          { color: 'green', gte: 50, lt: 90 },
        ],
      };

      const result = fromColorByValueAPIToLensState(colorByValue);

      expect(result).toEqual({
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          rangeType: 'percent',
          continuity: 'none',
          progression: 'fixed',
          reverse: false,
          steps: 2,
          maxSteps: 5,
          rangeMin: 10,
          rangeMax: 90,
          stops: [
            { color: 'red', stop: 50 },
            { color: 'green', stop: 90 },
          ],
          colorStops: [
            { color: 'red', stop: 10 },
            { color: 'green', stop: 50 },
          ],
        },
      } satisfies PaletteOutput<CustomPaletteParams>);
    });

    it('should default to absolute range when range is not specified', () => {
      const colorByValue = {
        type: 'dynamic',
        steps: [{ color: 'red', gte: 0, lte: 50 }],
      } satisfies Partial<ColorByValueType> as ColorByValueType;

      const result = fromColorByValueAPIToLensState(colorByValue);

      expect(result?.params?.rangeType).toBe('number');
    });
  });

  describe('fromColorByValueLensStateToAPI', () => {
    it('should return undefined when color is undefined', () => {
      expect(fromColorByValueLensStateToAPI(undefined)).toBeUndefined();
    });

    it('should return undefined when color params are undefined', () => {
      const palette: PaletteOutput<CustomPaletteParams> = {
        type: 'palette',
        name: 'custom',
      };

      expect(fromColorByValueLensStateToAPI(palette)).toBeUndefined();
    });

    it('should convert absolute range palette to API format', () => {
      const palette: PaletteOutput<CustomPaletteParams> = {
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          rangeType: 'number',
          stops: [
            { color: 'red', stop: 0 },
            { color: 'green', stop: 50 },
            { color: 'blue', stop: 100 },
          ],
          colorStops: [
            // @ts-expect-error - This can be null
            { color: 'red', stop: null },
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 50 },
          ],
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toMatchObject({
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { color: 'red', lt: 0 },
          { color: 'green', gte: 0, lt: 50 },
          { color: 'blue', gte: 50 },
        ],
      });
    });

    it('should convert percentage range palette to API format', () => {
      const palette: PaletteOutput<CustomPaletteParams> = {
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          rangeType: 'percent',
          rangeMin: 5,
          rangeMax: 95,
          stops: [
            { color: 'red', stop: 10 },
            { color: 'green', stop: 50 },
            { color: 'blue', stop: 90 },
          ],
          colorStops: [
            { color: 'red', stop: 5 },
            { color: 'green', stop: 10 },
            { color: 'blue', stop: 50 },
          ],
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toEqual({
        type: 'dynamic',
        range: 'percentage',
        steps: [
          { color: 'red', gte: 5, lt: 10 },
          { color: 'green', gte: 10, lt: 50 },
          { color: 'blue', gte: 50, lte: 95 },
        ],
      });
    });

    it('should handle single stop', () => {
      const palette: PaletteOutput<CustomPaletteParams> = {
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          rangeType: 'number',
          stops: [{ color: 'red', stop: 50 }],
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toEqual({
        type: 'dynamic',
        range: 'absolute',
        steps: [{ color: 'red', lt: 50 }],
      });
    });

    it('should handle two stops', () => {
      const palette: PaletteOutput<CustomPaletteParams> = {
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          rangeType: 'number',
          stops: [
            { color: 'red', stop: 0 },
            { color: 'green', stop: 100 },
          ],
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toEqual({
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { color: 'red', lt: 0 },
          { color: 'green', gte: 0 },
        ],
      });
    });

    it('should default to percentage range when rangeType is not specified', () => {
      const palette: PaletteOutput<CustomPaletteParams> = {
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          stops: [{ color: 'red', stop: 50 }],
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toEqual({
        type: 'dynamic',
        min: 0,
        max: 100,
        range: 'percentage',
        steps: [{ type: 'from', color: '#ff0000', from: 50 }],
      });
    });

    it('should handle empty stops array', () => {
      const palette: PaletteOutput<CustomPaletteParams> = {
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          rangeType: 'number',
          stops: [],
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toEqual({
        type: 'dynamic',
        range: 'absolute',
        steps: [],
      });
    });

    it('should reverse palette stops to API format', () => {
      const palette: PaletteOutput<CustomPaletteParams> = {
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          reverse: true,
          rangeType: 'number',
          stops: [
            { color: 'red', stop: 0 },
            { color: 'green', stop: 50 },
            { color: 'blue', stop: 100 },
          ],
          colorStops: [
            // @ts-expect-error - This can be null
            { color: 'red', stop: null },
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 50 },
          ],
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toMatchObject({
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { color: 'blue', lt: 0 },
          { color: 'green', gte: 0, lt: 50 },
          { color: 'red', gte: 50 },
        ],
      });
    });
  });

  describe('fromStaticColorLensStateToAPI', () => {
    it('should return undefined when color is undefined', () => {
      expect(fromStaticColorLensStateToAPI(undefined)).toBeUndefined();
    });

    it('should convert string color to static color type', () => {
      const color = '#ff0000';
      const result = fromStaticColorLensStateToAPI(color);

      expect(result).toEqual({
        type: 'static',
        color: '#ff0000',
      });
    });

    it('should handle hex color codes', () => {
      expect(fromStaticColorLensStateToAPI('#123456')).toEqual({
        type: 'static',
        color: '#123456',
      });
    });

    it('should handle named colors', () => {
      expect(fromStaticColorLensStateToAPI('red')).toEqual({
        type: 'static',
        color: 'red',
      });
    });

    it('should handle rgb colors', () => {
      expect(fromStaticColorLensStateToAPI('rgb(255, 0, 0)')).toEqual({
        type: 'static',
        color: 'rgb(255, 0, 0)',
      });
    });
  });

  describe('fromStaticColorAPIToLensState', () => {
    it('should return undefined when color is undefined', () => {
      expect(fromStaticColorAPIToLensState(undefined)).toBeUndefined();
    });

    it('should convert static color type to lens state format', () => {
      const staticColor: StaticColorType = {
        type: 'static',
        color: '#ff0000',
      };

      const result = fromStaticColorAPIToLensState(staticColor);

      expect(result).toEqual({
        color: '#ff0000',
      });
    });

    it('should handle different color formats in static color', () => {
      const hexColor: StaticColorType = { type: 'static', color: '#123456' };
      expect(fromStaticColorAPIToLensState(hexColor)).toEqual({ color: '#123456' });

      const namedColor: StaticColorType = { type: 'static', color: 'blue' };
      expect(fromStaticColorAPIToLensState(namedColor)).toEqual({ color: 'blue' });

      const rgbColor: StaticColorType = { type: 'static', color: 'rgb(0, 255, 0)' };
      expect(fromStaticColorAPIToLensState(rgbColor)).toEqual({ color: 'rgb(0, 255, 0)' });
    });
  });

  describe('fromColorMappingLensStateToAPI', () => {
    it('should convert basic', () => {
      expect(fromColorMappingLensStateToAPI(undefined)).toBeUndefined();
    });

    it('should convert categorical color mapping with empty assignments', () => {
      const originalColorMapping: ColorMapping.Config = {
        paletteId: 'kibana_palette',
        specialAssignments: [],
        assignments: [],
        colorMode: { type: 'categorical' },
      };

      const result = fromColorMappingLensStateToAPI(originalColorMapping);
      expect(result).toEqual({
        palette: 'kibana_palette',
        mode: 'categorical',
        mapping: [],
      });
    });

    it('should convert categorical color mapping with only special assignments', () => {
      const originalColorMapping: ColorMapping.Config = {
        paletteId: 'kibana_palette',
        specialAssignments: [
          { rules: [{ type: 'other' }], color: { type: 'loop' }, touched: false },
        ],
        assignments: [],
        colorMode: { type: 'categorical' },
      };

      const result = fromColorMappingLensStateToAPI(originalColorMapping);
      expect(result).toEqual({
        palette: 'kibana_palette',
        mode: 'categorical',
        mapping: [],
      });
    });

    it('should convert categorical color mapping with mixed assignments', () => {
      const originalColorMapping: ColorMapping.Config = {
        paletteId: 'kibana_palette',
        specialAssignments: [],
        assignments: [
          {
            rules: [{ type: 'raw', value: 'value1' }],
            color: { type: 'colorCode', colorCode: '#ff0000' },
            touched: false,
          },
          {
            rules: [
              { type: 'raw', value: 'value2' },
              { type: 'raw', value: 'value3' },
            ],
            color: { type: 'colorCode', colorCode: '#00ff00' },
            touched: false,
          },
          {
            rules: [{ type: 'raw', value: 'value1' }],
            color: { type: 'categorical', colorIndex: 1, paletteId: 'no_default' },
            touched: false,
          },
        ],
        colorMode: { type: 'categorical' },
      };

      const result = fromColorMappingLensStateToAPI(originalColorMapping);
      expect(result).toEqual({
        palette: 'kibana_palette',
        mode: 'categorical',
        mapping: [
          { color: { type: 'colorCode', value: '#ff0000' }, values: ['value1'] },
          { color: { type: 'colorCode', value: '#00ff00' }, values: ['value2', 'value3'] },
          { color: { type: 'from_palette', palette: 'no_default', index: 1 }, values: ['value1'] },
        ],
      });
    });
  });

  describe('fromColorMappingAPIToLensState', () => {
    it('should convert legacy color mapping', () => {
      expect(fromColorMappingAPIToLensState(undefined)).toBeUndefined();
    });

    it('should convert empty mapping correctly', () => {
      expect(
        fromColorMappingAPIToLensState({
          palette: 'kibana_palette',
          mode: 'categorical',
          mapping: [],
        })
      ).toEqual({
        colorMode: { type: 'categorical' },
        paletteId: 'kibana_palette',
        assignments: [],
        specialAssignments: [
          { color: { type: 'loop' }, rules: [{ type: 'other' }], touched: false },
        ],
      });
    });
  });

  describe('round-trip conversions', () => {
    describe('percentage range', () => {
      it.each([
        ['no limit', percentageMocks.noLimitPalette],
        ['lower limit', percentageMocks.lowerLimitPalette],
        ['upper limit', percentageMocks.upperLimitPalette],
        ['upper and lower limit', percentageMocks.upperAndLowerLimitPalette],
      ])('should convert lens palette state to API and back - %s', (_, palette) => {
        const apiColorByValue = fromColorByValueLensStateToAPI(palette);
        const returnedPaletteState = fromColorByValueAPIToLensState(apiColorByValue);

        expect(returnedPaletteState).toEqual(palette);
      });
    });

    describe('absolute range', () => {
      it.each([
        ['no limit', absoluteMocks.noLimitPalette],
        ['lower limit', absoluteMocks.lowerLimitPalette],
        ['upper limit', absoluteMocks.upperLimitPalette],
        ['upper and lower limit', absoluteMocks.upperAndLowerLimitPalette],
      ])('should convert lens palette state to API and back - %s', (_, palette) => {
        const apiColorByValue = fromColorByValueLensStateToAPI(palette);
        const returnedPaletteState = fromColorByValueAPIToLensState(apiColorByValue);

        expect(returnedPaletteState).toEqual(palette);
      });
    });

    describe('bad max steps', () => {
      it.each([
        ['no limit', badMaxStepsMocks.noLimitPalette],
        ['lower limit', badMaxStepsMocks.lowerLimitPalette],
        ['upper and lower limit', badMaxStepsMocks.upperAndLowerLimitPalette],
      ])('should convert lens palette state to API and back - %s', (_, palette) => {
        const apiColorByValue = fromColorByValueLensStateToAPI(palette);
        const returnedPaletteState = fromColorByValueAPIToLensState(apiColorByValue);

        // Currently the final stop value is set to the domain max or the implicit max value
        // instead of the more accurate rangeMax value. We need to override the final stop
        // value to the rangeMax value, to match that of the transformed state.
        // @ts-expect-error - This can be null
        palette.params!.stops!.at(-1)!.stop = palette.params!.rangeMax ?? null;

        expect(returnedPaletteState).toEqual(palette);
      });
    });

    it('should maintain data integrity for static colors', () => {
      const originalColor = '#ff0000';
      const apiFormat = fromStaticColorLensStateToAPI(originalColor);
      const backToLensState = fromStaticColorAPIToLensState(apiFormat);

      expect(backToLensState?.color).toBe(originalColor);
    });

    it('should maintain data integrity for absolute range color by value', () => {
      const originalColorByValue: ColorByValueType = {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { color: 'red', lt: 50 },
          { color: 'green', gte: 50, lt: 100 },
          { color: 'blue', gte: 100 },
        ],
      };

      const lensState = fromColorByValueAPIToLensState(originalColorByValue);
      const backToAPI = fromColorByValueLensStateToAPI(lensState);

      expect(backToAPI).toEqual(originalColorByValue);
    });

    it('should maintain data integrity with falsy min', () => {
      const originalColorByValue: ColorByValueType = {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { color: 'red', gte: 0, lt: 50 },
          { color: 'blue', gte: 50 },
        ],
      };

      const lensState = fromColorByValueAPIToLensState(originalColorByValue);
      const backToAPI = fromColorByValueLensStateToAPI(lensState);

      expect(backToAPI).toEqual(originalColorByValue);
    });

    it('should maintain data integrity with falsy max', () => {
      const originalColorByValue: ColorByValueType = {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { color: 'red', lt: -50 },
          { color: 'blue', gte: -50, lte: 0 },
        ],
      };

      const lensState = fromColorByValueAPIToLensState(originalColorByValue);
      const backToAPI = fromColorByValueLensStateToAPI(lensState);

      expect(backToAPI).toEqual(originalColorByValue);
    });

    it('should maintain data integrity for percentage range color by value', () => {
      const originalColorByValue: ColorByValueType = {
        type: 'dynamic',
        range: 'percentage',
        steps: [
          { color: 'red', gte: 5, lt: 90 },
          { color: 'green', gte: 90, lte: 95 },
        ],
      };

      const lensState = fromColorByValueAPIToLensState(originalColorByValue);
      const backToAPI = fromColorByValueLensStateToAPI(lensState);

      expect(backToAPI).toEqual(originalColorByValue);
    });

    it('should maintain data integrity for categorical color mapping with specific color codes', () => {
      const originalColorMapping: ColorMappingType = {
        palette: 'kibana_palette',
        mode: 'categorical',
        mapping: [
          {
            values: ['value1', 'value2', 'value3'],
            color: { type: 'colorCode', value: '#ff0000' },
          },
        ],
        unassignedColor: { type: 'colorCode', value: '#00ff00' },
      };

      const lensState = fromColorMappingAPIToLensState(originalColorMapping);
      const backToAPI = fromColorMappingLensStateToAPI(lensState);

      expect(backToAPI).toEqual(originalColorMapping);
    });

    it('should maintain data integrity for categorical color mapping with mixed assignments', () => {
      const originalColorMapping: ColorMappingType = {
        palette: 'kibana_palette',
        mode: 'categorical',
        mapping: [
          {
            values: ['value1', 'value2', 'value3'],
            color: { type: 'colorCode', value: '#ff0000' },
          },
          {
            values: ['value4', 'value5'],
            color: { type: 'from_palette', index: 2, palette: 'no_default' },
          },
        ],
      };

      const lensState = fromColorMappingAPIToLensState(originalColorMapping);
      const backToAPI = fromColorMappingLensStateToAPI(lensState);

      expect(backToAPI).toEqual(originalColorMapping);
    });

    it('should maintain data integrity for gradient color mapping with mixed assignments', () => {
      const originalColorMapping: ColorMappingType = {
        palette: 'kibana_palette',
        mode: 'gradient',
        mapping: [
          {
            values: ['value1', 'value2', 'value3'],
          },
          {
            values: ['value4', 'value5'],
          },
        ],
        gradient: [
          { type: 'colorCode', value: '#ff0000' },
          { type: 'from_palette', index: 2, palette: 'no_default' },
        ],
        unassignedColor: { type: 'colorCode', value: '#00ff00' },
      };

      const lensState = fromColorMappingAPIToLensState(originalColorMapping);
      const backToAPI = fromColorMappingLensStateToAPI(lensState);

      expect(backToAPI).toEqual(originalColorMapping);
    });
  });
});
