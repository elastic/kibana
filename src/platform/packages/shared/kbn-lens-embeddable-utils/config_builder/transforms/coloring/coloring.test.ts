/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorMapping, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { DEFAULT_COLOR_STEPS } from '@kbn/coloring';
import type { KbnPaletteId } from '@kbn/palettes';
import type { ColorByValueType, ColorMappingType, StaticColorType } from '../../schema/color';
import {
  fromColorByValueAPIToLensState,
  fromColorByValueLensStateToAPI,
  fromStaticColorLensStateToAPI,
  fromStaticColorAPIToLensState,
  fromColorMappingAPIToLensState,
  fromColorMappingLensStateToAPI,
  isColorByValueAbsolute,
  isColorByValuePalette,
  LEGACY_PALETTE_PREFIX,
} from './coloring';

import * as percentageMocks from './percentage.mocks';
import * as absoluteMocks from './absolute.mocks';
import * as badMaxStepsMocks from './bad_max_step.mocks';

const SEMANTIC_PALETTE: KbnPaletteId = 'default';
const CATEGORICAL_PALETTE: KbnPaletteId = 'eui_amsterdam';

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

    it('should convert percentage range color with implied min/max values', () => {
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

    it.each<[name: string, min: number | undefined | null, max: number | undefined | null]>([
      ['Infinity', -Infinity, Infinity],
      ['null', null, null],
      ['undefined', undefined, undefined],
    ])('should convert ranges with implied min/max values as "%s"', (_, min, max) => {
      const colorByValue: ColorByValueType = {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { color: 'red', gte: min, lt: 10 },
          { color: 'yellow', gte: 10, lt: 50 },
          { color: 'green', gte: 50, lte: max },
        ],
      };

      const result = fromColorByValueAPIToLensState(colorByValue);

      expect(result).toMatchObject({
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          rangeType: 'number',
          // @ts-expect-error - This can be null
          rangeMin: min ?? null, // uses null as fallback if undefined
          // @ts-expect-error - This can be null
          rangeMax: max ?? null, // uses null as fallback if undefined
          stops: [
            { color: 'red', stop: 10 },
            { color: 'yellow', stop: 50 },
            // @ts-expect-error - This can be null
            { color: 'green', stop: max ?? null }, // uses null as fallback if undefined
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

    describe('named palette (distributed_palette)', () => {
      it('should build a named palette with empty stops and default bands/range/continuity', () => {
        const colorByValue: ColorByValueType = {
          type: 'distributed_palette',
          palette: 'status',
        };

        const result = fromColorByValueAPIToLensState(colorByValue);

        expect(result).toEqual({
          type: 'palette',
          name: 'status',
          params: {
            name: 'status',
            progression: 'fixed',
            reverse: false,
            rangeType: 'percent',
            continuity: 'none',
            steps: DEFAULT_COLOR_STEPS,
            maxSteps: DEFAULT_COLOR_STEPS,
          },
        } satisfies PaletteOutput<CustomPaletteParams>);
      });

      it('should use the provided number of bands for the palette steps', () => {
        const colorByValue: ColorByValueType = {
          type: 'distributed_palette',
          palette: 'status',
        };

        const result = fromColorByValueAPIToLensState(colorByValue, 3);

        expect(result?.params?.steps).toBe(3);
        // maxSteps never drops below the shared default
        expect(result?.params?.maxSteps).toBe(DEFAULT_COLOR_STEPS);
      });

      it('should use numeric range type when useNumericRange is true', () => {
        const colorByValue: ColorByValueType = {
          type: 'distributed_palette',
          palette: 'status',
        };

        const result = fromColorByValueAPIToLensState(colorByValue, 3, true);

        expect(result?.params?.rangeType).toBe('number');
      });
    });

    describe('legacy_dynamic palette', () => {
      it('should rebuild a legacy palette as a named palette without stops', () => {
        const colorByValue: ColorByValueType = {
          type: 'legacy_dynamic',
          range: 'percentage',
          palette: 'temperature',
          shift: false,
          steps: [
            { color: 'red', gte: 0, lt: 50 },
            { color: 'green', gte: 50, lt: 90 },
            { color: 'blue', gte: 90 },
          ],
        };

        const result = fromColorByValueAPIToLensState(colorByValue, 3);

        expect(result).toEqual({
          type: 'palette',
          name: 'temperature',
          params: {
            name: 'temperature',
            progression: 'fixed',
            reverse: false,
            // default range type for distributed palettes
            rangeType: 'percent',
            // default continuity for distributed palettes
            continuity: 'none',
            steps: 3,
            maxSteps: DEFAULT_COLOR_STEPS,
          },
        } satisfies PaletteOutput<CustomPaletteParams>);
      });

      it('should ignore the shift flag', () => {
        const base = {
          type: 'legacy_dynamic',
          range: 'absolute',
          palette: 'temperature',
          steps: [
            { color: 'red', gte: 0, lt: 50 },
            { color: 'blue', gte: 50, lte: 100 },
          ],
        } satisfies Partial<ColorByValueType>;

        const shifted = fromColorByValueAPIToLensState({
          ...base,
          shift: true,
        });
        const unshifted = fromColorByValueAPIToLensState({
          ...base,
          shift: false,
        });

        expect(shifted).toEqual(unshifted);
      });

      it('should ignore the rangeType/continuity and the number of steps and use the default per chart values passed as arguments', () => {
        const colorByValue: ColorByValueType = {
          type: 'legacy_dynamic',
          range: 'absolute',
          palette: 'temperature',
          shift: false,
          steps: [
            { color: 'red', gte: 0, lt: 50 },
            { color: 'green', gte: 50, lt: 90 },
            { color: 'blue', gte: 90 },
          ],
        };

        const result = fromColorByValueAPIToLensState(colorByValue, 4);

        expect(result).toEqual({
          type: 'palette',
          name: 'temperature',
          params: {
            name: 'temperature',
            progression: 'fixed',
            reverse: false,
            rangeType: 'percent', // default range type for distributed palettes
            continuity: 'none', // default continuity for distributed palettes
            steps: 4, // the number of bands defined as argument
            maxSteps: DEFAULT_COLOR_STEPS,
          },
        } satisfies PaletteOutput<CustomPaletteParams>);
      });
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
      } satisfies ColorByValueType);
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
      } satisfies ColorByValueType);
    });

    it.each<[name: string, min: number | undefined | null, max: number | undefined | null]>([
      ['Infinity', -Infinity, Infinity],
      ['null', null, null],
      ['undefined', undefined, undefined],
    ])('should convert with open-ended bounds as "%s"', (_, min, max) => {
      const palette: PaletteOutput<CustomPaletteParams> = {
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          rangeType: 'number',
          // @ts-expect-error - This can be null
          rangeMin: min,
          // @ts-expect-error - This can be null
          rangeMax: max,
          stops: [
            { color: 'red', stop: 10 },
            { color: 'yellow', stop: 50 },
            { color: 'green', stop: 90 },
          ],
          continuity: 'all',
          maxSteps: 5,
        },
      };

      const result = fromColorByValueLensStateToAPI(palette);

      expect(result).toEqual({
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { color: 'red', lt: 10 },
          { color: 'yellow', gte: 10, lt: 50 },
          { color: 'green', gte: 50 },
        ],
      } satisfies ColorByValueType);
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
      } satisfies ColorByValueType);
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
      } satisfies ColorByValueType);
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
        range: 'percentage',
        steps: [{ lt: 50, color: 'red' }],
      } satisfies ColorByValueType);
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
      } satisfies ColorByValueType);
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
      } satisfies ColorByValueType);
    });

    describe('named palette (distributed_palette)', () => {
      it('should convert a non-custom palette to a rangeless distributed_palette', () => {
        const palette: PaletteOutput<CustomPaletteParams> = {
          type: 'palette',
          name: 'status',
          params: {
            name: 'status',
            rangeType: 'percent',
            continuity: 'above',
            stops: [
              { color: 'red', stop: 0 },
              { color: 'green', stop: 50 },
              { color: 'blue', stop: 100 },
            ],
          },
        };

        const result = fromColorByValueLensStateToAPI(palette);

        expect(result).toEqual({
          type: 'distributed_palette',
          palette: 'status',
        } satisfies ColorByValueType);
      });

      it('should drop coloring for an invalid palette name', () => {
        const palette: PaletteOutput<CustomPaletteParams> = {
          type: 'palette',
          name: 'test',
          params: {
            name: 'test',
            rangeType: 'percent',
            continuity: 'above',
            stops: [
              { color: 'red', stop: 0 },
              { color: 'green', stop: 50 },
            ],
          },
        };

        expect(fromColorByValueLensStateToAPI(palette)).toBeUndefined();
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
      } satisfies StaticColorType);
    });

    it('should handle hex color codes', () => {
      expect(fromStaticColorLensStateToAPI('#123456')).toEqual({
        type: 'static',
        color: '#123456',
      } satisfies StaticColorType);
    });

    it('should handle named colors', () => {
      expect(fromStaticColorLensStateToAPI('red')).toEqual({
        type: 'static',
        color: 'red',
      } satisfies StaticColorType);
    });

    it('should handle rgb colors', () => {
      expect(fromStaticColorLensStateToAPI('rgb(255, 0, 0)')).toEqual({
        type: 'static',
        color: 'rgb(255, 0, 0)',
      } satisfies StaticColorType);
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

    it('should convert legacy color palette', () => {
      const originalColorPalette: PaletteOutput = {
        type: 'palette',
        name: SEMANTIC_PALETTE,
      };

      const result = fromColorMappingLensStateToAPI(undefined, originalColorPalette);
      expect(result).toEqual({
        palette: `${LEGACY_PALETTE_PREFIX}${SEMANTIC_PALETTE}`,
        mode: 'categorical',
        mapping: [],
      });
    });

    it('should convert categorical color mapping with empty assignments', () => {
      const originalColorMapping: ColorMapping.Config = {
        paletteId: SEMANTIC_PALETTE,
        specialAssignments: [],
        assignments: [],
        colorMode: { type: 'categorical' },
      };

      const result = fromColorMappingLensStateToAPI(originalColorMapping);
      expect(result).toEqual({
        palette: SEMANTIC_PALETTE,
        mode: 'categorical',
        mapping: [],
      });
    });

    it('should convert categorical color mapping with only special assignments', () => {
      const originalColorMapping: ColorMapping.Config = {
        paletteId: SEMANTIC_PALETTE,
        specialAssignments: [
          { rules: [{ type: 'other' }], color: { type: 'loop' }, touched: false },
        ],
        assignments: [],
        colorMode: { type: 'categorical' },
      };

      const result = fromColorMappingLensStateToAPI(originalColorMapping);
      expect(result).toEqual({
        palette: SEMANTIC_PALETTE,
        mode: 'categorical',
        mapping: [],
      });
    });

    it('should convert categorical color mapping with mixed assignments', () => {
      const originalColorMapping: ColorMapping.Config = {
        paletteId: SEMANTIC_PALETTE,
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
            color: { type: 'categorical', colorIndex: 1, paletteId: CATEGORICAL_PALETTE },
            touched: false,
          },
        ],
        colorMode: { type: 'categorical' },
      };

      const result = fromColorMappingLensStateToAPI(originalColorMapping);
      expect(result).toEqual({
        palette: SEMANTIC_PALETTE,
        mode: 'categorical',
        mapping: [
          { color: { type: 'color_code', value: '#ff0000' }, values: ['value1'] },
          { color: { type: 'color_code', value: '#00ff00' }, values: ['value2', 'value3'] },
          {
            color: { type: 'from_palette', palette: CATEGORICAL_PALETTE, index: 1 },
            values: ['value1'],
          },
        ],
      });
    });

    it('should convert gradient color mapping from palette', () => {
      const originalColorMapping: ColorMapping.Config = {
        paletteId: SEMANTIC_PALETTE,
        specialAssignments: [],
        assignments: [],
        colorMode: {
          type: 'gradient',
          steps: [
            {
              type: 'categorical',
              colorIndex: 1,
              paletteId: CATEGORICAL_PALETTE,
              touched: true,
            },
          ],
          sort: 'desc',
        },
      };

      const result = fromColorMappingLensStateToAPI(originalColorMapping);
      expect(result).toEqual({
        palette: SEMANTIC_PALETTE,
        mode: 'gradient',
        mapping: [],
        sort: 'desc',
        gradient: [{ index: 1, palette: CATEGORICAL_PALETTE, type: 'from_palette' }],
      });
    });

    it('should convert gradient color mapping from color code', () => {
      const originalColorMapping: ColorMapping.Config = {
        paletteId: SEMANTIC_PALETTE,
        specialAssignments: [],
        assignments: [],
        colorMode: {
          type: 'gradient',
          steps: [
            { type: 'colorCode', colorCode: '#ff0000', touched: false },
            { type: 'colorCode', colorCode: '#ffff00', touched: false },
            { type: 'colorCode', colorCode: '#0000ff', touched: true },
          ],
          sort: 'asc',
        },
      };

      const result = fromColorMappingLensStateToAPI(originalColorMapping);
      expect(result).toEqual({
        palette: SEMANTIC_PALETTE,
        mode: 'gradient',
        mapping: [],
        sort: 'asc',
        gradient: [
          { type: 'color_code', value: '#ff0000' },
          { type: 'color_code', value: '#ffff00' },
          { type: 'color_code', value: '#0000ff' },
        ],
      });
    });
  });

  describe('fromColorMappingAPIToLensState', () => {
    it('should convert undefined color mapping', () => {
      expect(fromColorMappingAPIToLensState(undefined)).toBeUndefined();
    });

    it('should convert legacy color mapping', () => {
      expect(
        fromColorMappingAPIToLensState({
          palette: `${LEGACY_PALETTE_PREFIX}${SEMANTIC_PALETTE}`,
          mode: 'categorical',
          mapping: [],
        })
      ).toEqual({
        palette: {
          type: 'palette',
          name: SEMANTIC_PALETTE,
        },
      });
    });

    it('should convert empty mapping correctly', () => {
      expect(
        fromColorMappingAPIToLensState({
          palette: SEMANTIC_PALETTE,
          mode: 'categorical',
          mapping: [],
        })
      ).toEqual({
        colorMapping: {
          colorMode: { type: 'categorical' },
          paletteId: SEMANTIC_PALETTE,
          assignments: [],
          specialAssignments: [
            { color: { type: 'loop' }, rules: [{ type: 'other' }], touched: false },
          ],
        },
      });
    });

    it('should convert gradient color mapping', () => {
      const result = fromColorMappingAPIToLensState({
        palette: SEMANTIC_PALETTE,
        mode: 'gradient',
        mapping: [],
        sort: 'desc',
        gradient: [{ index: 1, palette: 'no_default', type: 'from_palette' }],
      });
      expect(result).toEqual({
        colorMapping: {
          paletteId: SEMANTIC_PALETTE,
          specialAssignments: [
            {
              color: { type: 'loop' },
              rules: [{ type: 'other' }],
              touched: false,
            },
          ],
          assignments: [],
          colorMode: {
            type: 'gradient',
            steps: [
              { type: 'categorical', colorIndex: 1, paletteId: 'no_default', touched: false },
            ],
            sort: 'desc',
          },
        },
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
        palette: SEMANTIC_PALETTE,
        mode: 'categorical',
        mapping: [
          {
            values: ['value1', 'value2', 'value3'],
            color: { type: 'color_code', value: '#ff0000' },
          },
        ],
        unassigned: { type: 'color_code', value: '#00ff00' },
      };

      const lensState = fromColorMappingAPIToLensState(originalColorMapping);
      expect(lensState).toBeDefined();
      expect('colorMapping' in lensState!).toBe(true);
      const backToAPI = fromColorMappingLensStateToAPI(
        (lensState as { colorMapping: ColorMapping.Config }).colorMapping
      );

      expect(backToAPI).toEqual(originalColorMapping);
    });

    it('should maintain data integrity for categorical color mapping with mixed assignments', () => {
      const originalColorMapping: ColorMappingType = {
        palette: SEMANTIC_PALETTE,
        mode: 'categorical',
        mapping: [
          {
            values: ['value1', 'value2', 'value3'],
            color: { type: 'color_code', value: '#ff0000' },
          },
          {
            values: ['value4', 'value5'],
            color: { type: 'from_palette', index: 2, palette: 'no_default' },
          },
        ],
      };

      const lensState = fromColorMappingAPIToLensState(originalColorMapping);
      expect(lensState).toBeDefined();
      expect('colorMapping' in lensState!).toBe(true);
      const backToAPI = fromColorMappingLensStateToAPI(
        (lensState as { colorMapping: ColorMapping.Config }).colorMapping
      );

      expect(backToAPI).toEqual(originalColorMapping);
    });

    describe('match rules', () => {
      it('should rebuild match rules as raw rules on round-trip (render-equivalent, lossy discriminator)', () => {
        const lensState: ColorMapping.Config = {
          paletteId: SEMANTIC_PALETTE,
          specialAssignments: [],
          assignments: [
            {
              rules: [
                { type: 'raw', value: 1000 },
                { type: 'match', pattern: 'CaseSensitive', matchEntireWord: true, matchCase: true },
                { type: 'match', pattern: 'LOWERCASE_ME', matchEntireWord: true, matchCase: false },
              ],
              color: { type: 'colorCode', colorCode: '#ff0000' },
              touched: false,
            },
            {
              rules: [
                { type: 'raw', value: 1500 },
                { type: 'match', pattern: '2000', matchEntireWord: true, matchCase: true },
                { type: 'match', pattern: '2500', matchEntireWord: true, matchCase: false },
              ],
              color: { type: 'colorCode', colorCode: '#00ff00' },
              touched: false,
            },
          ],
          colorMode: { type: 'categorical' },
        };

        const apiFormat = fromColorMappingLensStateToAPI(lensState);
        expect(apiFormat).toEqual({
          palette: SEMANTIC_PALETTE,
          mode: 'categorical',
          mapping: [
            {
              color: { type: 'color_code', value: '#ff0000' },
              values: [1000, 'CaseSensitive', 'lowercase_me'],
            },
            {
              color: { type: 'color_code', value: '#00ff00' },
              values: [1500, '2000', '2500'],
            },
          ],
        });

        const backToLensState = fromColorMappingAPIToLensState(apiFormat);
        expect(backToLensState).toEqual({
          colorMapping: {
            paletteId: SEMANTIC_PALETTE,
            assignments: [
              {
                rules: [
                  { type: 'raw', value: 1000 },
                  { type: 'raw', value: 'CaseSensitive' },
                  { type: 'raw', value: 'lowercase_me' },
                ],
                color: { type: 'colorCode', colorCode: '#ff0000' },
                touched: false,
              },
              {
                rules: [
                  { type: 'raw', value: 1500 },
                  { type: 'raw', value: '2000' },
                  { type: 'raw', value: '2500' },
                ],
                color: { type: 'colorCode', colorCode: '#00ff00' },
                touched: false,
              },
            ],
            specialAssignments: [
              { color: { type: 'loop' }, rules: [{ type: 'other' }], touched: false },
            ],
            colorMode: { type: 'categorical' },
          },
        });
      });
    });

    it('should maintain data integrity for gradient color mapping with mixed assignments', () => {
      const originalColorMapping: ColorMappingType = {
        palette: SEMANTIC_PALETTE,
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
          { type: 'color_code', value: '#ff0000' },
          { type: 'from_palette', index: 2, palette: 'no_default' },
        ],
        sort: 'asc',
        unassigned: { type: 'from_palette', palette: SEMANTIC_PALETTE, index: 2 },
      };

      const lensState = fromColorMappingAPIToLensState(originalColorMapping);
      expect(lensState).toBeDefined();
      expect('colorMapping' in lensState!).toBe(true);
      const backToAPI = fromColorMappingLensStateToAPI(
        (lensState as { colorMapping: ColorMapping.Config }).colorMapping
      );

      expect(backToAPI).toEqual(originalColorMapping);
    });
  });

  describe('color type guards', () => {
    const namedPalette: ColorByValueType = {
      type: 'distributed_palette',
      palette: 'status',
    };
    const absoluteColor: ColorByValueType = {
      type: 'dynamic',
      range: 'absolute',
      steps: [{ color: 'red', lt: 50 }],
    };
    const percentageColor: ColorByValueType = {
      type: 'dynamic',
      range: 'percentage',
      steps: [{ color: 'red', lt: 50 }],
    };

    describe('isColorByValuePalette', () => {
      it('should be true only for a named palette', () => {
        expect(isColorByValuePalette(namedPalette)).toBe(true);
        expect(isColorByValuePalette(absoluteColor)).toBe(false);
        expect(isColorByValuePalette(percentageColor)).toBe(false);
        expect(isColorByValuePalette(undefined)).toBe(false);
      });
    });

    describe('isColorByValueAbsolute', () => {
      it('should be false for named palette', () => {
        expect(isColorByValueAbsolute(namedPalette)).toBe(false);
      });

      it('should be true for absolute color by value and false for percentage', () => {
        expect(isColorByValueAbsolute(absoluteColor)).toBe(true);
        expect(isColorByValueAbsolute(percentageColor)).toBe(false);
      });

      it('should be false for undefined', () => {
        expect(isColorByValueAbsolute(undefined)).toBe(false);
      });
    });
  });
});
