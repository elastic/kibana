import { schema } from '@kbn/config-schema';
import { filterSchema } from './filter';

const genericOperationOptionsSchema = schema.object({
    /**
     * Label for the operation
     */
    label: schema.maybe(schema.string({
      meta: {
        description: 'Label for the operation'
      }
    })),
  });
  
  export const staticOperationDefinitionSchema = schema.object({
    operation: schema.literal("static_value"),
    /**
     * Static value
     */
    value: schema.number({
      meta: {
        description: 'Static value'
      }
    })
  });
  
  export const formulaOperationDefinitionSchema = schema.object({
    operation: schema.literal("formula"),
    /**
     * Formula
     */
    formula: schema.string({
      meta: {
        description: 'Formula'
      }
    }),
    ...genericOperationOptionsSchema.getPropSchemas(),
  });
  
  export const metricOperationSharedSchema = 
    schema.object({
      /**
       * Time scale
       */
      time_scale: schema.maybe(schema.string({ meta: { description: 'Time scale' } })),
      /**
       * Reduced time range
       */
      reduced_time_range: schema.maybe(schema.string({ meta: { description: 'Reduced time range' } })),
      /**
       * Time shift
       */
      time_shift: schema.maybe(schema.string({ meta: { description: 'Time shift' } })),
      /**
       * Filter
       */
      filter: schema.maybe(filterSchema),
      ...genericOperationOptionsSchema.getPropSchemas()
    });
  
  
  export const fieldBasedOperationSharedSchema = 
    schema.object({
      /**
       * Field to be used for the metric
       */
      field: schema.string({ meta: { description: 'Field to be used for the metric' } }),
      ...metricOperationSharedSchema.getPropSchemas()
    })
  
  const emptyAsNullSchema = schema.object({
    /**
     * Whether to consider null values as null
     */
    empty_as_null: schema.maybe(schema.boolean({
      meta: {
        description: 'Whether to consider null values as null'
      }
    }))
  })
  
  export const countMetricOperationSchema = schema.object({
    /**
     * Select the operation type
     */
    operation: schema.literal("count"),
    /**
     * Field to be used for the metric
     */
    field: schema.maybe(schema.string()),
    ...metricOperationSharedSchema.getPropSchemas(),
    ...emptyAsNullSchema.getPropSchemas()
  });
  
  export const uniqueValuesMetricOperationSchema = schema.object({
    operation: schema.literal("unique_values"),
    ...fieldBasedOperationSharedSchema.getPropSchemas()
  });
  
  export const metricOperationSchema = schema.object({
    operation: schema.oneOf([
      schema.literal("min"),
      schema.literal("max"),
      schema.literal("sum"),
      schema.literal("median")
    ]),
    ...fieldBasedOperationSharedSchema.getPropSchemas()
  });
  
  export const lastValueOperationSchema = schema.object({
    operation: schema.literal("last_value"),
    ...fieldBasedOperationSharedSchema.getPropSchemas()
  });
  
  export const percentileOperationSchema = schema.object({
    operation: schema.literal("percentile"),
    percentile: schema.number({ meta: { description: 'Percentile' } }),
    ...fieldBasedOperationSharedSchema.getPropSchemas()
  });
  
  export const percentileRanksOperationSchema = schema.object({
    operation: schema.literal("percentile_ranks"),
    ranks: schema.arrayOf(schema.number({ meta: { description: 'Rank' } })),
    ...fieldBasedOperationSharedSchema.getPropSchemas()
  });
  
  export const fieldMetricOperationsSchema = schema.oneOf([
    countMetricOperationSchema,
    uniqueValuesMetricOperationSchema,
    metricOperationSchema,
    lastValueOperationSchema,
    percentileOperationSchema,
    percentileRanksOperationSchema
  ]);
  
  export const differencesOperationSchema = schema.object({
    operation: schema.literal("differences"),
    of: fieldMetricOperationsSchema,
    ...genericOperationOptionsSchema.getPropSchemas()
  });
  
  export const movingAverageOperationSchema = schema.object({
    operation: schema.literal("moving_average"),
    of: fieldMetricOperationsSchema,
    window: schema.number({ meta: { description: 'Window' } }),
    ...genericOperationOptionsSchema.getPropSchemas()
  });
  
  export const cumulativeSumOperationSchema = 
    schema.object({
      operation: schema.literal("cumulative_sum"),
      of: fieldMetricOperationsSchema,
      ...genericOperationOptionsSchema.getPropSchemas()
    });
  
  export const counterRateOperationSchema = 
    schema.object({
      operation: schema.literal("counter_rate"),
      of: fieldMetricOperationsSchema,
      ...genericOperationOptionsSchema.getPropSchemas()
    });
    
  
  export const metricOperationDefinitionSchema = schema.oneOf([
    formulaOperationDefinitionSchema,
  //  staticOperationDefinitionSchema,
    fieldMetricOperationsSchema,
    differencesOperationSchema,
    movingAverageOperationSchema,
    cumulativeSumOperationSchema,
    counterRateOperationSchema,
    countMetricOperationSchema,
    uniqueValuesMetricOperationSchema,
    metricOperationSchema,
    lastValueOperationSchema,
    percentileOperationSchema,
    percentileRanksOperationSchema
  ]);