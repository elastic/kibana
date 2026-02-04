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

const colorByValueBase = schema.object({
  type: schema.literal('dynamic'), // Specifies that the color assignment is dynamic (by value). Possible value: 'dynamic'

  /**
   * Array of color steps defining the mapping from values to colors.
   * Each step can be:
   *   - 'from': Color applies from a specified value upwards.
   *   - 'to': Color applies up to a specified value.
   *   - 'exact': Color applies to an exact value.
   */
  steps: schema.arrayOf(
    schema.oneOf([
      schema.object({
        /**
         * Step type indicating the color applies from a specific value upwards.
         * Possible value: 'from'
         */
        type: schema.literal('from'),
        /**
         * The value from which this color applies (inclusive).
         */
        from: schema.number({
          meta: { description: 'The value from which this color applies (inclusive).' },
        }),
        /**
         * The color to use for this step.
         */
        color: schema.string({ meta: { description: 'The color to use for this step.' } }),
      }),
      schema.object({
        /**
         * Step type indicating the color applies up to a specific value.
         * Possible value: 'to'
         */
        type: schema.literal('to'),
        /**
         * The value up to which this color applies (inclusive).
         */
        to: schema.number({
          meta: { description: 'The value up to which this color applies (inclusive).' },
        }),
        /**
         * The color to use for this step.
         */
        color: schema.string({ meta: { description: 'The color to use for this step.' } }),
      }),
      schema.object({
        type: schema.literal('exact'), // Step type indicating the color applies to an exact value. Possible value: 'exact'
        /**
         * The exact value to which this color applies.
         */
        value: schema.number({
          meta: { description: 'The exact value to which this color applies.' },
        }),
        /**
         * The color to use for this exact value.
         */
        color: schema.string({ meta: { description: 'The color to use for this exact value.' } }),
      }),
    ]),
    {
      maxSize: 100,
      validate(steps) {
        if (
          steps.some((step) => step.type === 'from') &&
          steps.findIndex((step) => step.type === 'from') !== 0
        ) {
          return 'The "from" step must be the first step in the array.';
        }
        if (
          steps.some((step) => step.type === 'to') &&
          steps.findIndex((step) => step.type === 'to') !== steps.length - 1
        ) {
          return 'The "to" step must be the last step in the array.';
        }
        return undefined;
      },
    }
  ),
});

export const colorByValueAbsolute = colorByValueBase.extends(
  { range: schema.literal('absolute') },
  { meta: { id: 'colorByValueAbsolute' } }
);

export const colorByValueSchema = schema.oneOf(
  [
    colorByValueAbsolute,
    colorByValueBase.extends(
      {
        /**
         * The minimum value for the color range. Used as the lower bound for value-based color assignment.
         */
        min: schema.number({
          meta: {
            description:
              'The minimum value for the color range. Used as the lower bound for value-based color assignment.',
          },
        }),
        /**
         * The maximum value for the color range. Used as the upper bound for value-based color assignment.
         */
        max: schema.number({
          meta: {
            description:
              'The maximum value for the color range. Used as the upper bound for value-based color assignment.',
          },
        }),
        /**
         * Determines whether the range is interpreted as absolute or as a percentage of the data.
         * Possible values: 'absolute', 'percentage'
         */
        range: schema.literal('percentage'), // Range is interpreted as percentage values. Possible value: 'percentage'
      },
      { meta: { id: 'colorByValueRelative' } }
    ),
  ],
  { meta: { id: 'colorByValue' } }
);

export const staticColorSchema = schema.object(
  {
    type: schema.literal('static'), // Specifies that the color assignment is static (single color for all values). Possible value: 'static'
    /**
     * The static color to be used for all values.
     */
    color: schema.string({ meta: { description: 'The static color to be used for all values.' } }),
  },
  { meta: { id: 'staticColor' } }
);

const colorFromPaletteSchema = schema.object(
  {
    type: schema.literal('from_palette'),
    index: schema.number({ meta: { description: 'The index of the color in the palette.' } }),
    palette: schema.maybe(schema.string({ meta: { description: 'The palette name to use.' } })),
  },
  { meta: { id: 'colorFromPalette' } }
);

const colorCodeSchema = schema.object(
  {
    type: schema.literal('colorCode'),
    value: schema.string({ meta: { description: 'The static color value to use.' } }),
  },
  { meta: { id: 'colorCode' } }
);

const colorDefSchema = schema.oneOf([colorFromPaletteSchema, colorCodeSchema]);

const categoricalColorMappingSchema = schema.object(
  {
    mode: schema.literal('categorical'),
    palette: schema.string({
      meta: { description: 'The palette name to use for color assignment.' },
    }),
    mapping: schema.arrayOf(
      schema.object({
        values: schema.arrayOf(serializedValueSchema, { maxSize: 1000 }),
        color: colorDefSchema,
      }),
      { maxSize: 1000 }
    ),
    unassignedColor: schema.maybe(colorCodeSchema),
  },
  { meta: { id: 'categoricalColorMapping' } }
);

const gradientColorMappingSchema = schema.object(
  {
    mode: schema.literal('gradient'),
    palette: schema.string({
      meta: { description: 'The palette name to use for color assignment.' },
    }),
    mapping: schema.maybe(
      schema.arrayOf(
        schema.object({
          values: schema.arrayOf(serializedValueSchema, { maxSize: 100 }),
        }),
        { maxSize: 100 }
      )
    ),
    gradient: schema.maybe(schema.arrayOf(colorDefSchema, { maxSize: 3 })),
    unassignedColor: schema.maybe(colorCodeSchema),
  },
  { meta: { id: 'gradientColorMapping' } }
);

export const colorMappingSchema = schema.oneOf(
  [
    /**
     * Categorical color mapping: assigns colors from a palette to specific values.
     */
    categoricalColorMappingSchema,
    /**
     * Gradient color mapping: assigns a gradient of colors to a range of values.
     */
    gradientColorMappingSchema,
  ],
  { meta: { id: 'colorMapping' } }
);

export const allColoringTypeSchema = schema.oneOf([
  colorByValueSchema,
  staticColorSchema,
  colorMappingSchema,
]);

export type StaticColorType = TypeOf<typeof staticColorSchema>;
export type ColorByValueType = TypeOf<typeof colorByValueSchema>;
export type ColorByValueAbsoluteType = TypeOf<typeof colorByValueAbsolute>;
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
