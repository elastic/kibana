/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorMapping, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { ColorByValueType, ColorMappingType, StaticColorType } from '../schema/color';
import {
  fromColorByValueAPIToLensState,
  fromColorByValueLensStateToAPI,
  fromStaticColorLensStateToAPI,
  fromStaticColorAPIToLensState,
  fromColorMappingAPIToLensState,
  fromColorMappingLensStateToAPI,
} from './coloring';

describe('Color util transforms', () => {
  describe('fromColorByValueAPIToLensState', () => {
    it('should return undefined when color is undefined', () => {
      expect(fromColorByValueAPIToLensState(undefined)).toBeUndefined();
    });

    it('should convert absolute range color with from/to/exact steps', () => {
      const colorByValue: ColorByValueType = {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { type: 'from', color: '#ff0000', from: 0 },
          { type: 'exact', color: '#ffff00', value: 50 },
          { type: 'to', color: '#00ff00', to: 100 },
        ],
      };

      const result = fromColorByValueAPIToLensState(colorByValue);

      expect(result).toEqual({
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          rangeType: 'number',
          stops: [
            { color: '#ff0000', stop: 0 },
            { color: '#ffff00', stop: 50 },
            { color: '#00ff00', stop: 100 },
          ],
          colorStops: [
            { color: '#ff0000', stop: 0 },
            { color: '#ffff00', stop: 50 },
            { color: '#00ff00', stop: 100 },
          ],
        },
      });
    });

    it('should convert percentage range color with min/max values', () => {
      const colorByValue: ColorByValueType = {
        type: 'dynamic',
        range: 'percentage',
        min: 10,
        max: 90,
        steps: [
          { type: 'from', color: '#ff0000', from: 10 },
          { type: 'to', color: '#00ff00', to: 90 },
        ],
      };

      const result = fromColorByValueAPIToLensState(colorByValue);

      expect(result).toEqual({
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          rangeMin: 10,
          rangeMax: 90,
          rangeType: 'percent',
          stops: [
            { color: '#ff0000', stop: 10 },
            { color: '#00ff00', stop: 90 },
          ],
          colorStops: [
            { color: '#ff0000', stop: 10 },
            { color: '#00ff00', stop: 90 },
          ],
        },
      });
    });

    it('should default to absolute range when range is not specified', () => {
      const colorByValue: ColorByValueType = {
        type: 'dynamic',
        steps: [{ type: 'exact', color: '#ff0000', value: 50 }],
      } as ColorByValueType;

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
            { color: '#ff0000', stop: 0 },
            { color: '#ffff00', stop: 50 },
            { color: '#00ff00', stop: 100 },
          ],
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toEqual({
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { type: 'from', color: '#ff0000', from: 0 },
          { type: 'exact', color: '#ffff00', value: 50 },
          { type: 'to', color: '#00ff00', to: 100 },
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
          rangeMin: 10,
          rangeMax: 90,
          stops: [
            { color: '#ff0000', stop: 10 },
            { color: '#0000aa', stop: 50 },
            { color: '#00ff00', stop: 90 },
          ],
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toEqual({
        type: 'dynamic',
        min: 10,
        max: 90,
        range: 'percentage',
        steps: [
          { type: 'from', color: '#ff0000', from: 10 },
          { type: 'exact', color: '#0000aa', value: 50 },
          { type: 'to', color: '#00ff00', to: 90 },
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
          stops: [{ color: '#ff0000', stop: 50 }],
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toEqual({
        type: 'dynamic',
        range: 'absolute',
        steps: [{ type: 'from', color: '#ff0000', from: 50 }],
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
            { color: '#ff0000', stop: 0 },
            { color: '#00ff00', stop: 100 },
          ],
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toEqual({
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { type: 'from', color: '#ff0000', from: 0 },
          { type: 'to', color: '#00ff00', to: 100 },
        ],
      });
    });

    it('should default to percentage range when rangeType is not specified', () => {
      const palette: PaletteOutput<CustomPaletteParams> = {
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          stops: [{ color: '#ff0000', stop: 50 }],
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
          { type: 'from', color: '#ff0000', from: 0 },
          { type: 'exact', color: '#ffff00', value: 50 },
          { type: 'to', color: '#00ff00', to: 100 },
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
        min: 10,
        max: 90,
        steps: [
          { type: 'from', color: '#ff0000', from: 10 },
          { type: 'to', color: '#00ff00', to: 90 },
        ],
      };

      const lensState = fromColorByValueAPIToLensState(originalColorByValue);
      const backToAPI = fromColorByValueLensStateToAPI(lensState);

      expect(backToAPI).toEqual(originalColorByValue);
    });

    it('should mantain data integrity for categorical color mapping with specific color codes', () => {
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

    it('should mantain data integrity for categorical color mapping with mixed assignments', () => {
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

    it('should mantain data integrity for gradient color mapping with mixed assignments', () => {
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
