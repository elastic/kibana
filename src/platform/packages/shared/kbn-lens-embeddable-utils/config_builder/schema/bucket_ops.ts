import { schema } from '@kbn/config-schema';
import { filterSchema } from './filter';

export const bucketDateHistogramOperationSchema = schema.object({
    /**
     * Select bucket operation type
     */
    operation: schema.literal('date_histogram'),
    /**
     * Field to be used for the date histogram
     */
    field: schema.string({
      meta: {
        description: 'Field to be used for the date histogram'
      }
    }),
    /**
     * Suggested interval
     */
    suggested_interval: schema.maybe(schema.string({
      meta: {
        description: 'Suggested interval'
      }
    })),
    /**
     * Whether to use original time range
     */
    use_original_time_rangeoverride_time_range: schema.maybe(schema.boolean({
      meta: {
        description: 'Whether to use original time range'
      }
    })),
    /**
     * Whether to include empty rows
     */
    include_empty_rows: schema.maybe(schema.boolean({
      meta: {
        description: 'Whether to include empty rows'
      }
    })),
    drop_partial_intervalss: schema.maybe(schema.boolean({
      meta: {
        description: 'Whether to drop partial intervals'
      }
    })),
  });
  
  export const bucketTermsOperationSchema = schema.object({
    operation: schema.literal('terms'),
    /**
     * Fields to be used for the terms
     */
    fields: schema.arrayOf(schema.string({
      meta: {
        description: 'Fields to be used for the terms'
      }
    })),
    /**
     * Size of the terms
     */
    size: schema.number({
      defaultValue: 5,
      meta: { description: 'Size of the terms' }
    }),
    /**
     * Whether to increase accuracy
     */
    increase_accuracy: schema.maybe(schema.boolean({
      meta: {
        description: 'Whether to increase accuracy'
      }
    })),
    /**
     * Includes
     */
    includes: schema.maybe(
      schema.object({
        values: schema.arrayOf(schema.string({
          meta: {
            description: 'Values to include'
          }
        })),
        as_regex: schema.maybe(schema.boolean({
          meta: {
            description: 'Whether to use regex'
          }
        })),
      })
    ),
    /**
     * Excludes
     */
    excludes: schema.maybe(
      schema.object({
        values: schema.arrayOf(schema.string({
          meta: {
            description: 'Values to exclude'
          }
        })),
        as_regex: schema.maybe(schema.boolean({
          meta: {
            description: 'Whether to use regex'
          }
        })),
      })
    ),
    /**
     * Other bucket
     */
    other_bucket: schema.maybe(
      schema.object({
        include_documents_without_field: schema.boolean({
          meta: {
            description: 'Whether to include documents without field'
          }
        }),
      })
    ),
    /**
     * Rank by
     */
    rank_by: schema.maybe(schema.oneOf([
      schema.object({
        type: schema.literal('alphabetical'),
        /**
         * Direction of the alphabetical order
         */
        direction: schema.oneOf([
          schema.literal('asc'),
          schema.literal('desc'),
        ]),
      }),
      schema.object({
        type: schema.literal('rare'),
        /**
         * Maximum number of rare terms
         */
        max: schema.number({
          meta: {
            description: 'Maximum number of rare terms'
          }
        }),
      }),
      schema.object({
        type: schema.literal('significant'),
      }),
      schema.object({
        type: schema.literal('column'),
        /**
         * Metric to be used for the column
         */
        metric: schema.number({
          meta: {
            description: 'Metric to be used for the column'
          }
        }),
        /**
         * Direction of the column
         */
        direction: schema.oneOf([
          schema.literal('asc'),
          schema.literal('desc'),
        ]),
      }),
      schema.object({
        type: schema.literal('custom'),
        /**
         * Operation type
         */
        operation: schema.literal('field-op-only'),
        /**
         * Field to be used for the custom operation
         */
        field: schema.string({
          meta: {
            description: 'Field to be used for the custom operation'
          }
        }),
        /**
         * Direction of the custom operation
         */
        direction: schema.oneOf([
          schema.literal('asc'),
          schema.literal('desc'),
        ]),
      }),
    ])),
  });
  
  export const bucketFilterOperationSchema = schema.object({
    operation: schema.literal('filters'),
    /**
     * Filters
     */
    filters: schema.arrayOf(filterSchema),
  })
  
  export const bucketHistogramOperationSchema = schema.object({
    operation: schema.literal('histogram'),
    /**
     * Field to be used for the histogram
     */
    field: schema.string({
      meta: {
        description: 'Field to be used for the histogram'
      }
    }),
    /**
     * Granularity of the histogram
     */
    granularity: schema.number({ 
      meta: { 
        description: 'Granularity of the histogram' 
      },
      min: 1, 
      max: 7 
    }),
    /**
     * Whether to include empty rows
     */
    include_empty_rows: schema.maybe(schema.boolean({
      meta: {
        description: 'Whether to include empty rows'
      }
    })),
  });
  
  export const bucketRangesOperationSchema = schema.object({
    operation: schema.literal('range'),
    /**
     * Field to be used for the range
     */
    field: schema.string({
      meta: {
        description: 'Field to be used for the range'
      }
    }),
    /**
     * Ranges
     */
    ranges: schema.arrayOf(
      schema.object({
        /**
         * Less than or equal to
         */
        lte: schema.maybe(schema.number({
          meta: {
            description: 'Less than or equal to'
          }
        })),
        /**
         * Greater than
         */
        gt: schema.maybe(schema.number({
          meta: {
            description: 'Greater than'
          }
        })),
        /**
         * Label
         */
        label: schema.maybe(schema.string({
          meta: {
            description: 'Label'
          }
        }))
      })
    )
  });
  
  export const bucketOperationDefinitionSchema = schema.oneOf([
    bucketDateHistogramOperationSchema,
    bucketTermsOperationSchema,
    bucketHistogramOperationSchema,
    bucketRangesOperationSchema,
    bucketFilterOperationSchema,
  ]);