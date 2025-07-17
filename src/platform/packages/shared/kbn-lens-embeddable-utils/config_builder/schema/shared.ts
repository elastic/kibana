import { schema } from '@kbn/config-schema';

export const sharedPanelInfoSchema = schema.object({
    /**
     * The title of the chart displayed in the panel.
     *
     * Optional. If not provided, the chart will not have a title.
     *
     * Possible values: Any string value, or undefined if omitted.
     */
    title: schema.maybe(schema.string({
      meta: {
        description: 'The title of the chart displayed in the panel. Optional. Any string value or undefined.'
      }
    })),
    /**
     * The description of the chart, providing additional context or information.
     *
     * Optional. If not provided, the chart will not have a description.
     *
     * Possible values: Any string value, or undefined if omitted.
     */
    description: schema.maybe(schema.string({
      meta: {
        description: 'The description of the chart. Optional. Any string value or undefined.'
      }
    })),

  });
  
export const layerSettingsSchema = schema.object({
    /**
     * The sampling factor for the dataset.
     *
     * Determines the proportion of the dataset to be used. Must be a number between 0 and 1 (inclusive).
     * - 0: No sampling (use none of the data)
     * - 1: Full sampling (use all data)
     * - Any value between 0 and 1: Use that proportion of the data
     *
     * Default: 1
     * Possible values: number (0 <= value <= 1)
     */
    samplings: schema.number({ 
      min: 0, 
      max: 1, 
      defaultValue: 1, 
      meta: { 
        description: 'Sampling factor between 0 (no sampling) and 1 (full sampling). Default is 1.' 
      } 
    }),
    /**
     * Whether to ignore global filters when fetching data for this layer.
     *
     * If true, global filters (such as those set in the dashboard or application context) will be ignored for this layer.
     * If false, global filters will be applied.
     *
     * Default: false
     * Possible values: boolean (true or false)
     */
    ignore_global_filters: schema.boolean({ 
      defaultValue: false, 
      meta: { 
        description: 'If true, ignore global filters when fetching data for this layer. Default is false.' 
      } 
    }),
  });
  
  export const collapseBySchema = schema.oneOf([
    /**
     * Average collapsed by average function
     */
    schema.literal('avg'),
    /**
     * Sum collapsed by sum function
     */
    schema.literal('sum'),
    /**
     * Max collapsed by max function
     */
    schema.literal('max'),
    /**
     * Min collapsed by min function
     */
    schema.literal('min'),
    schema.literal('none'),
  ], { meta: { description: 'Collapse by function description' } });