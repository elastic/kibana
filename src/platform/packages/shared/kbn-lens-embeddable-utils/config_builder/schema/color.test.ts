/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coloringTypeSchema } from './color';

describe('Color Schema', () => {
  describe('colorByValue schema', () => {
    it('validates a valid dynamic color configuration', () => {
      const input = {
        type: 'dynamic' as const,
        min: 0,
        max: 100,
        range: 'absolute' as const,
        steps: [
          {
            type: 'from' as const,
            from: 0,
            color: '#ff0000',
          },
          {
            type: 'to' as const,
            to: 50,
            color: '#00ff00',
          },
          {
            type: 'exact' as const,
            value: 75,
            color: '#0000ff',
          },
        ],
      };

      const validated = coloringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates percentage range type', () => {
      const input = {
        type: 'dynamic' as const,
        min: 0,
        max: 100,
        range: 'percentage' as const,
        steps: [],
      };

      const validated = coloringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on invalid range type', () => {
      const input = {
        type: 'dynamic',
        min: 0,
        max: 100,
        range: 'invalid',
        steps: [],
      };

      expect(() => coloringTypeSchema.validate(input)).toThrow();
    });
  });

  describe('staticColor schema', () => {
    it('validates a valid static color configuration', () => {
      const input = {
        type: 'static' as const,
        color: '#ff0000',
      };

      const validated = coloringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });

  describe('colorMapping schema', () => {
    it('validates a valid categorical color mapping', () => {
      const input = {
        palette: 'kibana_palette',
        type: 'categorical' as const,
        colorMapping: {
          values: ['success', 'warning', 'error'],
        },
        otherColors: {
          categorical: {
            index: 0,
            palette: 'default',
          },
          static: '#cccccc',
        },
      };

      const validated = coloringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates a valid gradient color mapping', () => {
      const input = {
        palette: 'kibana_palette',
        type: 'gradient' as const,
        gradient: [
          {
            categorical: {
              index: 0,
              palette: 'default',
            },
          },
          {
            static: '#ff0000',
          },
        ],
        colorMapping: [
          {
            values: ['low', 'medium', 'high'],
          },
        ],
        otherColors: {
          categorical: {
            index: 0,
          },
        },
      };

      const validated = coloringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });

  describe('validation errors', () => {
    it('throws on missing required fields in dynamic configuration', () => {
      const input = {
        type: 'dynamic',
        min: 0,
        // missing max
        range: 'absolute',
        steps: [],
      };

      expect(() => coloringTypeSchema.validate(input)).toThrow();
    });

    it('throws on invalid color format in static configuration', () => {
      const input = {
        type: 'static',
        palette: 'not-a-color',
      };

      expect(() => coloringTypeSchema.validate(input)).toThrow();
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

      expect(() => coloringTypeSchema.validate(input)).toThrow();
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

      expect(() => coloringTypeSchema.validate(input)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('validates dynamic configuration with minimum required fields', () => {
      const input = {
        type: 'dynamic' as const,
        min: 0,
        max: 100,
        range: 'absolute' as const,
        steps: [],
      };

      const validated = coloringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates color mapping with minimal otherColors', () => {
      const input = {
        palette: 'kibana_palette',
        type: 'categorical' as const,
        colorMapping: {
          values: ['value1'],
        },
        otherColors: {},
      };

      const validated = coloringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });
});
