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
import { isNil } from 'lodash';
import { serializedValueSchema } from './serializedValue';

const colorByValueStepSchema = schema.object(
  {
    /**
     * The lower bound of range from which this color applies (inclusive).
     */
    gte: schema.maybe(
      schema.nullable(
        schema.number({
          meta: {
            description: 'The lower bound of range from which this color applies (inclusive).',
          },
        })
      )
    ),
    /**
     * The upper bound of range to which this color applies (exclusive).
     */
    lt: schema.maybe(
      schema.nullable(
        schema.number({
          meta: {
            description: 'The upper bound of range to which this color applies (exclusive).',
          },
        })
      )
    ),
    /**
     * The upper bound of range to which this color applies (inclusive).
     */
    lte: schema.maybe(
      schema.nullable(
        schema.number({
          meta: {
            description: 'The upper bound of range to which this color applies (inclusive).',
          },
        })
      )
    ),
    /**
     * The color to use for this step.
     */
    color: schema.string({ meta: { description: 'The color to use for this step.' } }),
  },
  {
    validate(step) {
      if (isNil(step.gte) && isNil(step.lt) && isNil(step.lte)) {
        return 'At least one of "gte", "lt", or "lte" must be provided.';
      }

      if (!isNil(step.lt) && !isNil(step.lte)) {
        return 'Cannot provide both "lt" and "lte" for the same step.';
      }

      if (!isNil(step.gte) && !isNil(step.lt) && step.gte > step.lt) {
        return 'Inverted range: "gte" value must be less than the "lt" value';
      }

      if (!isNil(step.gte) && !isNil(step.lte) && step.gte > step.lte) {
        return 'Inverted range: "gte" value must be less than the "lte" value';
      }
    },
  }
);

export const colorByValueStepsSchema = schema.arrayOf(colorByValueStepSchema, {
  meta: {
    description: 'Array of ordered color steps defining the range each color is applied.',
  },
  minSize: 1,
  maxSize: 100,
  validate(steps) {
    let trackingValue = steps[0].gte ?? steps[0].lt ?? -Infinity;
    for (const [i, step] of steps.entries()) {
      if (isNil(step.gte)) {
        if (i === 0) continue;
        return 'The "gte" value is required for all steps except the first.';
      }

      if (isNil(step.lt)) {
        if (i === steps.length - 1) continue;
        return 'The "lt" value is required for all steps except the last.';
      }

      if (!isNil(step.lte) && i !== steps.length - 1) {
        return 'The "lte" value is only permitted on the last step.';
      }

      if (step.gte !== trackingValue && i !== 0) {
        return `Step ranges must be continuous. "step[${i}].gte" and "step[${
          i - 1
        }].lt" must be equal.`;
      }

      trackingValue = step.lt;
    }
  },
});

const colorByValueBaseSchema = schema.object({
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

export const colorByValueAbsoluteSchema = colorByValueBaseSchema.extends({
  range: schema.literal('absolute'),
});

export const colorByValuePercentageSchema = colorByValueBaseSchema.extends({
  range: schema.literal('percentage'),
});

export const colorByValueSchema = schema.oneOf([
  colorByValueAbsoluteSchema,
  colorByValuePercentageSchema,
]);

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
      values: schema.arrayOf(serializedValueSchema, { maxSize: 1000 }),
      color: colorDefSchema,
    }),
    { maxSize: 1000 }
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
        values: schema.arrayOf(serializedValueSchema, { maxSize: 100 }),
      }),
      { maxSize: 100 }
    )
  ),
  gradient: schema.maybe(schema.arrayOf(colorDefSchema, { maxSize: 3 })),
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
export type ColorByValueStep = TypeOf<typeof colorByValueStepSchema>;
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
