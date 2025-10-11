/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { allColoringTypeSchema, type ColorByValueType, type ColorMappingType } from './color';

describe('Color Schema', () => {
  describe('colorByValue schema', () => {
    it('validates a valid dynamic absolute color configuration', () => {
      const input: ColorByValueType = {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          {
            type: 'from',
            from: 0,
            color: '#ff0000',
          },
          {
            type: 'exact',
            value: 50,
            color: '#0000ff',
          },
          {
            type: 'to',
            to: 75,
            color: '#00ff00',
          },
        ],
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates percentage range type', () => {
      const input: ColorByValueType = {
        type: 'dynamic',
        min: 0,
        max: 100,
        range: 'percentage',
        steps: [
          {
            type: 'from',
            from: 0,
            color: '#ff0000',
          },
          {
            type: 'exact',
            value: 50,
            color: '#0000ff',
          },
          {
            type: 'to',
            to: 75,
            color: '#00ff00',
          },
        ],
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throw on invalid steps sorting order', () => {
      const input: ColorByValueType = {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          {
            type: 'from',
            from: 0,
            color: '#ff0000',
          },
          {
            type: 'to',
            to: 50,
            color: '#00ff00',
          },
          {
            type: 'exact',
            value: 75,
            color: '#0000ff',
          },
        ],
      };

      expect(() => allColoringTypeSchema.validate(input)).toThrow();
    });

    it('throws on invalid range type', () => {
      const input = {
        type: 'dynamic',
        min: 0,
        max: 100,
        range: 'invalid',
        steps: [],
      };

      expect(() => allColoringTypeSchema.validate(input)).toThrow();
    });
  });

  describe('staticColor schema', () => {
    it('validates a valid static color configuration', () => {
      const input = {
        type: 'static',
        color: '#ff0000',
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });

  describe('colorMapping schema', () => {
    it('validates a full static categorical color mapping', () => {
      const input: ColorMappingType = {
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

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates a full static categorical color mapping with loop unassigned', () => {
      const input: ColorMappingType = {
        palette: 'kibana_palette',
        mode: 'categorical',
        mapping: [
          {
            values: ['value1', 'value2', 'value3'],
            color: { type: 'colorCode', value: '#ff0000' },
          },
        ],
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates a full categorical color mapping', () => {
      const input: ColorMappingType = {
        palette: 'kibana_palette',
        mode: 'categorical',
        mapping: [
          {
            values: ['value1', 'value2', 'value3'],
            color: { type: 'from_palette', palette: 'default', index: 0 },
          },
        ],
        unassignedColor: { type: 'colorCode', value: '#00ff00' },
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates a full categorical color mapping with loop unassigned', () => {
      const input: ColorMappingType = {
        palette: 'kibana_palette',
        mode: 'categorical',
        mapping: [
          {
            values: ['value1', 'value2', 'value3'],
            color: { type: 'from_palette', palette: 'default', index: 0 },
          },
        ],
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates a full categorical color mapping with mixed assignments', () => {
      const input: ColorMappingType = {
        palette: 'kibana_palette',
        mode: 'categorical',
        mapping: [
          {
            values: ['value1', 'value2', 'value3'],
            color: { type: 'from_palette', palette: 'default', index: 0 },
          },
          {
            values: ['value4', 'value5', 'value6'],
            color: { type: 'colorCode', value: '#00ff00' },
          },
        ],
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates a valid gradient color mapping using palette color', () => {
      const input: ColorMappingType = {
        palette: 'kibana_palette',
        mode: 'gradient',
        mapping: [{ values: ['low', 'medium', 'high'] }],
        gradient: [
          {
            type: 'from_palette',
            index: 0,
            palette: 'default',
          },
          {
            type: 'from_palette',
            index: 2,
            palette: 'default',
          },
        ],
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates a valid gradient color mapping using palette color and unassigned values', () => {
      const input: ColorMappingType = {
        palette: 'kibana_palette',
        mode: 'gradient',
        mapping: [{ values: ['low', 'medium', 'high'] }],
        gradient: [
          {
            type: 'from_palette',
            index: 0,
            palette: 'default',
          },
          {
            type: 'from_palette',
            index: 2,
            palette: 'default',
          },
        ],
        unassignedColor: { type: 'colorCode', value: '#00ff00' },
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });

  describe('validation errors', () => {
    it('throws on missing required fields in dynamic configuration', () => {
      const input = {
        type: 'dynamic',
        min: 0,
        // missing max
        range: 'percentage',
        steps: [],
      };

      expect(() => allColoringTypeSchema.validate(input)).toThrow();
    });

    it('throws on invalid color format in static configuration', () => {
      const input = {
        type: 'static',
        palette: 'not-a-color',
      };

      expect(() => allColoringTypeSchema.validate(input)).toThrow();
    });

    it('throws on invalid mode in color mapping', () => {
      const input = {
        palette: 'kibana_palette',
        mode: 'invalid',
        colorMapping: {
          values: ['value1'],
        },
        otherColors: {},
      };

      expect(() => allColoringTypeSchema.validate(input)).toThrow();
    });

    it('throws on empty values array in categorical mapping', () => {
      const input = {
        palette: 'kibana_palette',
        mode: 'categorical',
        colorMapping: {
          values: [],
        },
        otherColors: {},
      };

      expect(() => allColoringTypeSchema.validate(input)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('validates dynamic configuration with minimum required fields', () => {
      const input = {
        type: 'dynamic',
        range: 'absolute',
        steps: [],
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates color mapping with minimal otherColors', () => {
      const input: ColorMappingType = {
        palette: 'kibana_palette',
        mode: 'categorical',
        mapping: [],
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });
});
