import { schema } from '@kbn/config-schema';

export const sharedPanelInfoSchema = schema.object({
    /**
     * Title of the chart
     */
    title: schema.maybe(schema.string({
      meta: {
        description: 'Title of the chart'
      }
    })),
    /**
     * Description of the chart
     */
    description: schema.maybe(schema.string({
      meta: {
        description: 'Description of the chart'
      }
    })),
  });
  
export const layerSettingsSchema = schema.object({
    /**
     * The sampling factor for the dataset.
     * Must be between 0 and 1, where 0 means no sampling and 1 means full sampling.
     *
     * @minimum 0
     * @maximum 1
     */
    samplings: schema.number({ 
      min: 0, 
      max: 1, 
      defaultValue: 1, 
      meta: { 
        description: 'Sampling factor' 
      } 
    }),
    /**
     * Whether to ignore global filters
     */
    ignore_global_filters: schema.boolean({ 
      defaultValue: false, 
      meta: { 
        description: 'Ignore global filters' 
      } 
    }),
  });
  