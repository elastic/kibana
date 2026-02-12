/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { freeze, produce } from 'immer';

import type { ColorByValueStep, ColorByValueType, ColorMappingType } from './color';
import { allColoringTypeSchema, colorByValueStepsSchema } from './color';

describe('Color Schema', () => {
  describe('colorByValue schema', () => {
    describe('colorByValueSchema.step schema', () => {
      const color = 'red';

      it.each<[message: string, constraints: Omit<ColorByValueStep, 'color'>]>([
        ['gte and lt', { gte: 0, lt: 100 }],
        ['gte and lte', { gte: 0, lte: 100 }],
        ['gte and lte', { gte: 0, lte: 100 }],
        ['gte only', { gte: 0 }],
        ['lt only', { lt: 0 }],
        ['lte only', { lte: 0 }],
      ])('should validate for %s', (_, constraints) => {
        const step: ColorByValueStep = { color, ...constraints };
        const validated = colorByValueStepsSchema.validate([step]);
        expect(validated).toEqual([step]);
      });

      describe('validation errors', () => {
        it('should invalidate unconstrained step', () => {
          const step: ColorByValueStep = { color };

          expect(() => {
            colorByValueStepsSchema.validate([step]);
          }).toThrowErrorMatchingInlineSnapshot(
            `"[0]: At least one of \\"gte\\", \\"lt\\", or \\"lte\\" must be provided."`
          );
        });

        it('should invalidate using both lt and lte (overconstrained)', () => {
          const step: ColorByValueStep = { color, lte: 50, lt: 100 };

          expect(() => {
            colorByValueStepsSchema.validate([step]);
          }).toThrowErrorMatchingInlineSnapshot(
            `"[0]: Cannot provide both \\"lt\\" and \\"lte\\" for the same step."`
          );
        });

        it('should invalidate using inverted range - lt', () => {
          const step: ColorByValueStep = { color, gte: 100, lt: 50 };

          expect(() => {
            colorByValueStepsSchema.validate([step]);
          }).toThrowErrorMatchingInlineSnapshot(
            `"[0]: Inverted range: \\"gte\\" value must be less than the \\"lt\\" value"`
          );
        });

        it('should invalidate using inverted range - lte', () => {
          const step: ColorByValueStep = { color, gte: 100, lte: 50 };

          expect(() => {
            colorByValueStepsSchema.validate([step]);
          }).toThrowErrorMatchingInlineSnapshot(
            `"[0]: Inverted range: \\"gte\\" value must be less than the \\"lte\\" value"`
          );
        });
      });
    });

    describe.each<ColorByValueType['range']>(['absolute', 'percentage'])(
      'range type - %s',
      (range) => {
        const baseConfig = freeze<ColorByValueType>({
          type: 'dynamic',
          range,
          steps: [
            { gte: 0, lt: 50, color: 'red' },
            { gte: 50, lt: 75, color: 'green' },
            { gte: 75, lte: 100, color: 'blue' },
          ],
        });

        it('should validate complete step ranges', () => {
          const validated = allColoringTypeSchema.validate(baseConfig);
          expect(validated).toEqual(baseConfig);
        });

        it('should validate with implicit lower and upper bounds', () => {
          const config = produce(baseConfig, (base) => {
            base.steps[0].gte = undefined;
            base.steps[2].lt = undefined;
          });
          const validated = allColoringTypeSchema.validate(config);
          expect(validated).toEqual(config);
        });

        it('should validate with implicit lower bound', () => {
          const config = produce(baseConfig, (base) => {
            base.steps[0].gte = undefined;
          });
          const validated = allColoringTypeSchema.validate(config);
          expect(validated).toEqual(config);
        });

        it('should validate with implicit upper bound', () => {
          const config = produce(baseConfig, (base) => {
            base.steps[2].lt = undefined;
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

          it('should invalidate implicit "gte" on middle step', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[1].gte = undefined;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate implicit "gte" on last step', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[2].gte = undefined;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate "lte" on first step', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[0].lte = base.steps[0].lt;
              base.steps[0].lt = null;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate "lte" on middle step', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[1].lte = base.steps[1].lt;
              base.steps[1].lt = null;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate implicit "lt" on middle step', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[1].lt = undefined;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate implicit "gte" on first step', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[0].lt = undefined;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate discontinuous step ranges', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[1].gte = base.steps[1].gte! + 1;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate overlapping step ranges', () => {
            const config = produce(baseConfig, (base) => {
              base.steps[0].lt = base.steps[1].gte! + 1;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate inverted range - lt', () => {
            const config = produce(baseConfig, (base) => {
              const { gte, lt } = base.steps[1];
              base.steps[1].lt = gte;
              base.steps[1].gte = lt;
            });
            expect(() => allColoringTypeSchema.validate(config)).toThrow();
          });

          it('should invalidate inverted range - lte', () => {
            const config = produce(baseConfig, (base) => {
              const { gte, lte } = base.steps[2];
              base.steps[2].lte = gte;
              base.steps[2].gte = lte;
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
        color: 'red',
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
            color: { type: 'colorCode', value: 'red' },
          },
        ],
        unassignedColor: { type: 'colorCode', value: 'green' },
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
            color: { type: 'colorCode', value: 'red' },
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
        unassignedColor: { type: 'colorCode', value: 'green' },
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
            color: { type: 'colorCode', value: 'green' },
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
        unassignedColor: { type: 'colorCode', value: 'green' },
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
