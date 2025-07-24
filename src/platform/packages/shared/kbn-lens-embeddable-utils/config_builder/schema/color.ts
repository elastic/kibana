import { schema } from '@kbn/config-schema';

const colorByValueSchema = schema.object({
  type: schema.literal('dynamic'), // Specifies that the color assignment is dynamic (by value). Possible value: 'dynamic'
  /**
   * The minimum value for the color range. Used as the lower bound for value-based color assignment.
   */
  min: schema.number({ meta: { description: 'The minimum value for the color range. Used as the lower bound for value-based color assignment.' } }),
  /**
   * The maximum value for the color range. Used as the upper bound for value-based color assignment.
   */
  max: schema.number({ meta: { description: 'The maximum value for the color range. Used as the upper bound for value-based color assignment.' } }),
  /**
   * Determines whether the range is interpreted as absolute or as a percentage of the data.
   * Possible values: 'absolute', 'percentage'
   */
  range: schema.oneOf([
    schema.literal('absolute'), // Range is interpreted as absolute values. Possible value: 'absolute'
    schema.literal('percentage'), // Range is interpreted as percentage values. Possible value: 'percentage'
  ], { meta: { description: "Determines whether the range is interpreted as absolute or as a percentage of the data. Possible values: 'absolute', 'percentage'" } }),
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
        from: schema.number({ meta: { description: 'The value from which this color applies (inclusive).' } }),
        /**
         * The color to use for this step.
         */
        color: schema.string({ meta: { description: 'The color to use for this step.' } })
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
        to: schema.number({ meta: { description: 'The value up to which this color applies (inclusive).' } }),
        /**
         * The color to use for this step.
         */
        color: schema.string({ meta: { description: 'The color to use for this step.' } })
      }),
      schema.object({
        type: schema.literal('exact'), // Step type indicating the color applies to an exact value. Possible value: 'exact'
        /**
         * The exact value to which this color applies.
         */
        value: schema.number({ meta: { description: 'The exact value to which this color applies.' } }),
        /**
         * The color to use for this exact value.
         */
        color: schema.string({ meta: { description: 'The color to use for this exact value.' } })
      })
    ])
  )
});
  
const staticColorSchema = schema.object({
  type: schema.literal('static'), // Specifies that the color assignment is static (single color for all values). Possible value: 'static'
  /**
   * The static color to be used for all values.
   */
  color: schema.string({ meta: { description: 'The static color to be used for all values.' } })
});
  
const colorDefinitionSchema = schema.object({
  /**
   * Optional. Defines a categorical color assignment.
   */
  categorical: schema.maybe(schema.object({
    /**
     * The index of the color in the palette.
     */
    index: schema.number({ meta: { description: 'The index of the color in the palette.' } }),
    /**
     * (Optional) The palette name to use for color assignment.
     */
    palette: schema.maybe(schema.string()), // The palette name to use for color assignment.
  })),
  /**
   * Optional. The static color value to use.
   */
  static: schema.maybe(schema.string()), // The static color value to use.
});
  
const colorMappingSchema = schema.oneOf([
  /**
   * Categorical color mapping: assigns colors from a palette to specific values.
   */
  schema.object({
    /**
     * The palette name to use for color assignment.
     */
    palette: schema.string({ meta: { description: 'The palette name to use for color assignment.' } }),
    /**
     * The color mapping mode.
     * Possible value: 'categorical'
     */
    mode: schema.literal("categorical"), // The color mapping mode. Possible value: 'categorical'
    /**
     * Object mapping values to colors.
     * 'values' is an array of string values to which the categorical color applies.
     */
    colorMapping: schema.object({
      values: schema.arrayOf(schema.string({ meta: { description: 'A value to which the categorical color applies.' } }))
    }),
    /**
     * Color definition for values not explicitly mapped.
     */
    otherColors: colorDefinitionSchema
  }),
  /**
   * Gradient color mapping: assigns a gradient of colors to a range of values.
   */
  schema.object({
    /**
     * The palette name to use for the gradient color assignment.
     */
    palette: schema.string({ meta: { description: 'The palette name to use for the gradient color assignment.' } }),
    /**
     * The color mapping mode.
     * Possible value: 'gradient'
     */
    mode: schema.literal("gradient"), // The color mapping mode. Possible value: 'gradient'
    /**
     * Array of color definitions representing the gradient.
     */
    gradient: schema.arrayOf(colorDefinitionSchema),
    /**
     * Array of objects, each with 'values' as an array of strings to which a gradient color applies.
     */
    colorMapping: schema.arrayOf(
      schema.object({
        values: schema.arrayOf(schema.string({ meta: { description: 'A value to which the gradient color applies.' } }))
      })
    ),
    /**
     * Color definition for values not explicitly mapped.
     */
    otherColors: colorDefinitionSchema
  })
]);
  
export const coloringTypeSchema = schema.oneOf([
    colorByValueSchema,
    staticColorSchema
])