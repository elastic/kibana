/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { freeze, produce } from 'immer';

import { allColoringTypeSchema, type ColorByValueType, type ColorMappingType } from './color';

describe('Color Schema', () => {
  describe('colorByValue schema', () => {
    describe.each<ColorByValueType['range']>(['absolute', 'percentage'])(
      'range type - %s',
      (range) => {
        const baseConfig = freeze<ColorByValueType>({
          type: 'dynamic',
          range,
          steps: [
            { from: 0, to: 50, color: '#ff0000' },
            { from: 50, to: 75, color: '#00ff00' },
            { from: 75, to: 100, color: '#0000ff' },
          ],
        });

        it('should validate complete step ranges', () => {
          const validated = allColoringTypeSchema.validate(baseConfig);
          expect(validated).toEqual(baseConfig);
        });

        it('should validate with implicit lower and upper bounds', () => {
          const config = produce(baseConfig, (base) => {
            base.steps[0].from = undefined;
            base.steps[2].to = undefined;
          });
          const validated = allColoringTypeSchema.validate(config);
          expect(validated).toEqual(config);
        });

        it('should validate with implicit lower bound', () => {
          const config = produce(baseConfig, (base) => {
            base.steps[0].from = undefined;
          });
          const validated = allColoringTypeSchema.validate(config);
          expect(validated).toEqual(config);
        });

        it('should validate with implicit upper bound', () => {
          const config = produce(baseConfig, (base) => {
            base.steps[2].to = undefined;
          });
          const validated = allColoringTypeSchema.validate(config);
          expect(validated).toEqual(config);
        });

        describe('validation errors', () => {
          it('should invalidate empty steps', () => {
            const config = produce(baseConfig, (base) => {
              base.steps = [];
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate implicit from on middle step', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[1].from = undefined;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate implicit from on last step', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[2].from = undefined;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate implicit to on middle step', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[1].to = undefined;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate implicit from on first step', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[0].to = undefined;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate discontinuous step ranges', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[1].from = base.steps[1].from! + 1;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate overlapping step ranges', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[0].to = base.steps[1].from! + 1;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate inverted range', () => {
            const config = produce(baseConfig, (base) => {
              const { from, to } = base.steps[1];
              base.steps[1].to = from;
              base.steps[1].from = to;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });
        });
      }
    );
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

    describe('validation errors', () => {
      it('throws on invalid color format in static configuration', () => {
        const input = {
          type: 'static',
          palette: 'not-a-color',
        };

        expect(() => allColoringTypeSchema.validate(input)).toThrow();
      });
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

    it('validates color mapping with minimal otherColors', () => {
      const input: ColorMappingType = {
        palette: 'kibana_palette',
        mode: 'categorical',
        mapping: [],
      };

      const validated = allColoringTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    describe('validation errors', () => {
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
  });
});
