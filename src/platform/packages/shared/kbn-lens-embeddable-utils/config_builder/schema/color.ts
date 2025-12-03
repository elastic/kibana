/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedValueSchema } from './serializedValue';

const colorByValueStepsSchema = schema.arrayOf(
  schema.object({
    /**
     * The value from which this color applies (inclusive).
     */
    from: schema.maybe(
      schema.number({
        meta: { description: 'The value from which this color applies (inclusive).' },
      })
    ),
    /**
     * The value up to which this color applies (inclusive).
     */
    to: schema.maybe(
      schema.number({
        meta: { description: 'The value up to which this color applies (inclusive).' },
      })
    ),
    /**
     * The color to use for this step.
     */
    color: schema.string({ meta: { description: 'The color to use for this step.' } }),
  }),
  {
    meta: {
      description: 'Array of ordered color steps defining the range each color is applied.',
    },
    minSize: 1,
    validate(steps) {
      let trackingValue = steps[0].from ?? steps[0].to ?? -Infinity;
      for (const [i, step] of steps.entries()) {
        if (step.from === undefined) {
          if (i === 0) continue;
          return 'The "from" value is required for all steps except the first.';
        }

        if (step.to === undefined) {
          if (i === steps.length - 1) continue;
          return 'The "to" value is required for all steps except the last.';
        }

        if (step.from > step.to) {
          return `"step[${i}].from" must be less than the "step[${i}].to".`;
        }

        if (step.from !== trackingValue && i !== 0) {
          return `Step ranges must be continuous. "step[${i}].from" and "step[${
            i - 1
          }].to" must be equal.`;
        }

        trackingValue = step.to;
      }
    },
  }
);

const colorByValueSchema = schema.object({
  type: schema.literal('dynamic'),

  /**
   * Determines whether the range is interpreted as absolute or as a percentage of the data.
   */
  range: schema.oneOf([schema.literal('absolute'), schema.literal('percentage')], {
    meta: {
      description:
        'Determines whether the range is interpreted as absolute or as a percentage of the data.',
    },
  }),

  /**
   * Array of color steps defining the mapping from values to colors.
   */
  steps: colorByValueStepsSchema,
});

export const staticColorSchema = schema.object({
  type: schema.literal('static'), // Specifies that the color assignment is static (single color for all values). Possible value: 'static'
  /**
   * The static color to be used for all values.
   */
  color: schema.string({ meta: { description: 'The static color to be used for all values.' } }),
});

const colorFromPaletteSchema = schema.object({
  type: schema.literal('from_palette'),
  index: schema.number({ meta: { description: 'The index of the color in the palette.' } }),
  palette: schema.maybe(schema.string({ meta: { description: 'The palette name to use.' } })),
});

const colorCodeSchema = schema.object({
  type: schema.literal('colorCode'),
  value: schema.string({ meta: { description: 'The static color value to use.' } }),
});

const colorDefSchema = schema.oneOf([colorFromPaletteSchema, colorCodeSchema]);

const categoricalColorMappingSchema = schema.object({
  mode: schema.literal('categorical'),
  palette: schema.string({
    meta: { description: 'The palette name to use for color assignment.' },
  }),
  mapping: schema.arrayOf(
    schema.object({
      values: schema.arrayOf(serializedValueSchema),
      color: colorDefSchema,
    })
  ),
  unassignedColor: schema.maybe(colorCodeSchema),
});

const gradientColorMappingSchema = schema.object({
  mode: schema.literal('gradient'),
  palette: schema.string({
    meta: { description: 'The palette name to use for color assignment.' },
  }),
  mapping: schema.maybe(
    schema.arrayOf(
      schema.object({
        values: schema.arrayOf(serializedValueSchema),
      })
    )
  ),
  gradient: schema.maybe(schema.arrayOf(colorDefSchema)),
  unassignedColor: schema.maybe(colorCodeSchema),
});

export const colorMappingSchema = schema.oneOf([
  /**
   * Categorical color mapping: assigns colors from a palette to specific values.
   */
  categoricalColorMappingSchema,
  /**
   * Gradient color mapping: assigns a gradient of colors to a range of values.
   */
  gradientColorMappingSchema,
]);

export const allColoringTypeSchema = schema.oneOf([
  colorByValueSchema,
  staticColorSchema,
  colorMappingSchema,
]);

export type StaticColorType = TypeOf<typeof staticColorSchema>;
export type ColorByValueType = TypeOf<typeof colorByValueSchema>;
export type ColorMappingType = TypeOf<typeof colorMappingSchema>;
export type ColorMappingCategoricalType = TypeOf<typeof categoricalColorMappingSchema>;
export type ColorMappingGradientType = TypeOf<typeof gradientColorMappingSchema>;
export type ColorMappingColorDefType = TypeOf<typeof colorDefSchema>;
export type AllColoringTypes = TypeOf<typeof allColoringTypeSchema>;
/**
 * Schema for where to apply the color (to value or background).
 */
export const applyColorToSchema = schema.oneOf(
  [schema.literal('value'), schema.literal('background')],
  {
    meta: { description: 'Where to apply the color' },
  }
);
