/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNil } from 'lodash';
import { z } from '@kbn/zod';
import { serializedValueSchema } from './serializedValue';

const colorByValueStepSchema = z
  .object({
    /**
     * The lower bound of range from which this color applies (inclusive).
     */
    gte: z.number().nullable().optional().meta({
      description: 'The lower bound of range from which this color applies (inclusive).',
    }),
    /**
     * The upper bound of range to which this color applies (exclusive).
     */
    lt: z.number().nullable().optional().meta({
      description: 'The upper bound of range to which this color applies (exclusive).',
    }),
    /**
     * The upper bound of range to which this color applies (inclusive).
     */
    lte: z.number().nullable().optional().meta({
      description: 'The upper bound of range to which this color applies (inclusive).',
    }),
    /**
     * The color to use for this step.
     */
    color: z.string().meta({ description: 'The color to use for this step.' }),
  })
  .superRefine((step, ctx) => {
    if (isNil(step.gte) && isNil(step.lt) && isNil(step.lte)) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one of "gte", "lt", or "lte" must be provided.',
      });
      return;
    }

    if (!isNil(step.lt) && !isNil(step.lte)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Cannot provide both "lt" and "lte" for the same step.',
      });
      return;
    }

    if (!isNil(step.gte) && !isNil(step.lt) && step.gte > step.lt) {
      ctx.addIssue({
        code: 'custom',
        message: 'Inverted range: "gte" value must be less than the "lt" value',
      });
      return;
    }

    if (!isNil(step.gte) && !isNil(step.lte) && step.gte > step.lte) {
      ctx.addIssue({
        code: 'custom',
        message: 'Inverted range: "gte" value must be less than the "lte" value',
      });
    }
  });

export const colorByValueStepsSchema = z
  .array(colorByValueStepSchema)
  .min(1)
  .max(100)
  .meta({
    description: 'Array of ordered color steps defining the range each color is applied.',
  })
  .superRefine((steps, ctx) => {
    let trackingValue = steps[0]?.gte ?? steps[0]?.lt ?? -Infinity;
    for (const [i, step] of steps.entries()) {
      if (isNil(step.gte)) {
        if (i === 0) continue;
        ctx.addIssue({
          code: 'custom',
          message: 'The "gte" value is required for all steps except the first.',
        });
        return;
      }

      if (isNil(step.lt)) {
        if (i === steps.length - 1) continue;
        ctx.addIssue({
          code: 'custom',
          message: 'The "lt" value is required for all steps except the last.',
        });
        return;
      }

      if (!isNil(step.lte) && i !== steps.length - 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'The "lte" value is only permitted on the last step.',
        });
        return;
      }

      if (step.gte !== trackingValue && i !== 0) {
        ctx.addIssue({
          code: 'custom',
          message: `Step ranges must be continuous. "step[${i}].gte" and "step[${
            i - 1
          }].lt" must be equal.`,
        });
        return;
      }

      trackingValue = step.lt;
    }
  });

const colorByValueBaseSchema = z.object({
  type: z.literal('dynamic'),

  /**
   * Determines whether the range is interpreted as absolute or as a percentage of the data.
   */
  range: z.union([z.literal('absolute'), z.literal('percentage')]).meta({
    description:
      'Determines whether the range is interpreted as absolute or as a percentage of the data.',
  }),

  /**
   * Array of color steps defining the mapping from values to colors.
   */
  steps: colorByValueStepsSchema,
});

export const legacyColorByValueSchema = colorByValueBaseSchema
  .extend({
    type: z.literal('legacy_dynamic'),

    palette: z.string().meta({
      description: 'The legacy palette name.',
    }),

    shift: z.boolean().meta({
      description:
        'When `true`, shifts the palette colors so they start from a different offset. Defaults to `false`.',
    }),
  })
  .meta({
    id: 'legacyColorByValue',
    title: 'Legacy color by value',
    description: 'Legacy color by value configuration',
    deprecated: true,
  });

export const legacyColorByValueAbsoluteSchema = legacyColorByValueSchema
  .extend({
    range: z.literal('absolute'),
  })
  .meta({
    id: 'legacyColorByValueAbsolute',
    title: 'Legacy color by value (absolute)',
    description: 'Legacy color by absolute value configuration',
    deprecated: true,
  });

export const colorByValueAbsoluteSchema = colorByValueBaseSchema
  .extend({
    range: z.literal('absolute'),
  })
  .meta({
    id: 'colorByValueAbsolute',
    title: 'Color By Value (Absolute)',
    description: 'Color by absolute value configuration',
  });

export const colorByValuePercentageSchema = colorByValueBaseSchema
  .extend({
    range: z.literal('percentage'),
  })
  .meta({
    id: 'colorByValuePercentage',
    title: 'Color By Value (Percentage)',
    description: 'Color by percentage value configuration',
  });

export const colorByValueSchema = z
  .union([colorByValueAbsoluteSchema, colorByValuePercentageSchema, legacyColorByValueSchema])
  .meta({
    id: 'colorByValue',
    title: 'Color By Value',
    description:
      'Dynamic color mapping by numeric range, with support for absolute and percentage-based ranges.',
  });

export const staticColorSchema = z
  .object({
    type: z.literal('static'), // Specifies that the color assignment is static (single color for all values). Possible value: 'static'
    /**
     * The static color to be used for all values.
     */
    color: z.string().meta({ description: 'The static color to be used for all values.' }),
  })
  .meta({
    id: 'staticColor',
    title: 'Static Color',
    description: 'Fixed color for all values in the dimension.',
  });

const colorFromPaletteSchema = z
  .object({
    type: z.literal('from_palette'),
    index: z.number().meta({ description: 'The index of the color in the palette.' }),
    palette: z.string().optional().meta({
      description:
        "Color palette name. Accepted values: 'default', 'elastic_line_optimized', 'severity', 'eui_amsterdam', 'kibana_v7_legacy', 'elastic_brand_2023'. Defaults to `default`.",
    }),
  })
  .meta({
    id: 'colorFromPalette',
    title: 'Color From Palette',
    description: 'Color at a fixed index position in a named palette.',
  });

const colorCodeSchema = z
  .object({
    type: z.literal('color_code'),
    value: z.string().meta({ description: 'The static color value to use.' }),
  })
  .meta({
    id: 'color_code',
    title: 'Color Code',
    description: 'A color specified as a hex or CSS color code string.',
  });

const colorDefSchema = z.union([colorFromPaletteSchema, colorCodeSchema]);

const unassignedColorSchema = z.union([colorFromPaletteSchema, colorCodeSchema]).meta({
  id: 'unassignedColorSchema',
  description: 'The color to use for unassigned values.',
});

const categoricalColorMappingSchema = z
  .object({
    mode: z.literal('categorical'),
    palette: z.string().meta({
      description:
        "Color palette name. Accepted values: 'default', 'elastic_line_optimized', 'severity', 'eui_amsterdam', 'kibana_v7_legacy', 'elastic_brand_2023'. Defaults to `default`.",
    }),
    mapping: z
      .array(
        z.object({
          values: z.array(serializedValueSchema).max(1000),
          color: colorDefSchema,
        })
      )
      .max(1000),
    unassigned: unassignedColorSchema.optional(),
  })
  .meta({
    id: 'categoricalColorMapping',
    title: 'Categorical Color Mapping',
    description:
      'Palette color assignment for specific categorical values. Unmapped values receive the unassigned color.',
  });

const gradientColorMappingSchema = z
  .object({
    mode: z.literal('gradient'),
    palette: z.string().meta({
      description:
        "Color palette name. Accepted values: 'default', 'elastic_line_optimized', 'severity', 'eui_amsterdam', 'kibana_v7_legacy', 'elastic_brand_2023'. Defaults to `default`.",
    }),
    sort: z
      .union([z.literal('asc'), z.literal('desc')])
      .optional()
      .meta({ description: 'Sort direction' }),
    mapping: z
      .array(
        z.object({
          values: z.array(serializedValueSchema).max(100),
        })
      )
      .max(100)
      .optional(),
    gradient: z.array(colorDefSchema).max(3).optional(),
    unassigned: unassignedColorSchema.optional(),
  })
  .meta({
    id: 'gradientColorMapping',
    title: 'Gradient Color Mapping',
    description: 'Gradient color mapping across categorical values.',
  });

const DEFAULT_CATEGORICAL_COLOR_MAPPING_VALUE: z.output<typeof categoricalColorMappingSchema> = {
  mode: 'categorical',
  palette: 'default',
  mapping: [],
};

export const colorMappingSchema = z
  .union([
    /**
     * Categorical color mapping: assigns colors from a palette to specific values.
     */
    categoricalColorMappingSchema,
    /**
     * Gradient color mapping: assigns a gradient of colors to a range of values.
     */
    gradientColorMappingSchema,
  ])
  .default(DEFAULT_CATEGORICAL_COLOR_MAPPING_VALUE)
  .meta({
    id: 'colorMapping',
    title: 'Color Mapping',
    description:
      'Color mapping for dimension values, either categorical (for specific values) or as a gradient.',
  });

export const noColorSchema = z
  .object({ type: z.literal('none') })
  .meta({ id: 'noColor', title: 'No Color', description: 'Explicitly disables coloring' });

export const autoColorSchema = z.object({ type: z.literal('auto') }).meta({
  id: 'autoColor',
  title: 'Auto Color',
  description: 'Coloring determined at runtime based on chart defaults',
});

export const allColoringTypeSchema = z
  .union([
    colorByValueSchema,
    staticColorSchema,
    colorMappingSchema,
    noColorSchema,
    autoColorSchema,
  ])
  .meta({
    id: 'allColoringType',
    title: 'Color Configuration',
    description:
      'Color configuration for a dimension, with options for value-range coloring, static color, categorical or gradient color mapping, or no color.',
  });

export type StaticColorType = z.output<typeof staticColorSchema>;
export type ColorByValueType = z.output<typeof colorByValueSchema>;
export type ColorByValueAbsolute =
  | z.output<typeof colorByValueAbsoluteSchema>
  | z.output<typeof legacyColorByValueAbsoluteSchema>;
export type ColorByValueStep = z.output<typeof colorByValueStepSchema>;
export type ColorMappingType = z.output<typeof colorMappingSchema>;
export type ColorMappingCategoricalType = z.output<typeof categoricalColorMappingSchema>;
export type ColorMappingGradientType = z.output<typeof gradientColorMappingSchema>;
export type ColorMappingColorDefType = z.output<typeof colorDefSchema>;
export type NoColorType = z.output<typeof noColorSchema>;
export type AutoColorType = z.output<typeof autoColorSchema>;
export type AllColoringTypes = z.output<typeof allColoringTypeSchema>;
export type UnassignedColorType = z.output<typeof unassignedColorSchema>;

export const NO_COLOR: NoColorType = { type: 'none' };
export const AUTO_COLOR: AutoColorType = { type: 'auto' };
export const DEFAULT_CATEGORICAL_COLOR_MAPPING: ColorMappingCategoricalType =
  DEFAULT_CATEGORICAL_COLOR_MAPPING_VALUE;

/**
 * Schema for where to apply the color (to value or background).
 */
export const applyColorToSchema = z.union([z.literal('value'), z.literal('background')]).meta({
  description:
    'Color target: `value` colors the metric text, `background` colors the cell or panel background.',
});
