import { z } from "zod"

const sharedPanelInfoSchema = z.object({
  /**
   * Title of the chart
   */
  title: z.string().optional().describe('Title of the chart'),
  /**
   * Description of the chart
   */
  description: z.string().optional().describe('Description of the chart')
})

const numericFormatSchema = z.object({
  type: z.union([z.literal("number"), z.literal("percent")]),
  /**
   * Number of decimals
   */
  decimals: z.number().optional().default(2),
  /**
   * Suffix
   */
  suffix: z.string().optional().default(''),
  /**
   * Whether to use compact notation
   */
  compact: z.boolean().optional().default(false)
})

const byteFormatSchema = z.object({
  type: z.union([z.literal("bits"), z.literal("bytes")]),
  /**
   * Number of decimals
   */
  decimals: z.number().optional(),
  /**
   * Suffix
   */
  suffix: z.string().optional()
})

const durationFormatSchema = z.object({
  type: z.literal("duration"),
  /**
   * From
   */
  from: z.string(),
  /**
   * To
   */
  to: z.string(),
  /**
   * Suffix
   */
  suffix: z.string().optional()
})

const customFormatSchema = z.object({
  type: z.literal("custom"),
  /**
   * Pattern
   */
  pattern: z.string()
})

/**
 * Format configuration
 */
export const formatTypeSchema = z.union([
  numericFormatSchema,
  byteFormatSchema,
  durationFormatSchema,
  customFormatSchema
])

export const layerSettingsSchema = z.object({
  /**
   * The sampling factor for the dataset.
   * Must be between 0 and 1, where 0 means no sampling and 1 means full sampling.
   *
   * @minimum 0
   * @maximum 1
   */
  samplings: z
    .number()
    .min(0)
    .max(1)
    .optional().default(1),
  /**
   * Whether to ignore global filters
   */
  ignore_global_filters: z.boolean().optional().default(false)
})

export const collapseBySchema = z.union([
  z.literal("avg"),
  z.literal("sum"),
  z.literal("max"),
  z.literal("min"),
  z.literal("none")
])

/**
 * Dataset configuration
 */
export const datasetTypeSchema = z.union([
  z.object({
    type: z.literal("dataView"),
    /**
     * Name of the kibana dataview
     */
    name: z.string().describe('Name of the kibana dataview')
  }).describe('Data view'),
  z.object({
    type: z.literal("index"),
    /**
     * Name of the index
     */
    index: z.string().describe('Name of the index'),
    /**
     * Name of the time field
     */
    time_field: z.string().describe('Name of the time field'),
    /**
     * Runtime fields
     */
    runtime_fields: z
      .array(
        z.object({
          type: z.string(),
          name: z.string(),
          format: z.any().optional()
        })
      )
      .optional()
  }).describe('Index'),
  z.object({
    type: z.literal("esql"),
    /**
     * ESQL query
     */
    query: z.string().describe('ESQL query')
  }).describe('ESQL'),
  z.object({
    type: z.literal("table"),
    /**
     * Kibana Datatable
     */
    table: z.any().describe('kibana datatable')
  }).describe('table')
]).describe('Dataset type')

const genericOperationOptionsSchema = z.object({
  /**
   * Label for the operation
   */
  label: z.string().optional()
})

export const filterSchema = z.object({
  /**
   * Filter query
   */
  query: z.object({
    /**
     * Language of the filter query
     */
    language: z.union([z.literal("kuery"), z.literal("lucene")]),
    /**
     * Filter query
     */
    query: z.string()
  }),
  /**
   * Label for the filter
   */
  label: z.string().optional()
})

export const bucketOperationDefinitionSchema = z.union([
  z.object({
    operation: z.literal("date_histogram"),
    /**
     * Field to be used for the date histogram
     */
    field: z.string(),
    /**
     * Suggested interval for the date histogram
     */
    suggested_interval: z.string().optional(),
    /**
     * Whether to use original time range
     */
    use_original_time_rangeoverride_time_range: z.boolean().optional(),
    /**
     * Whether to include empty rows
     */
    include_empty_rows: z.boolean().optional(),
    /**
     * Whether to drop partial intervals
     */
    drop_partial_intervalss: z.boolean().optional()
  }),
  z.object({
    operation: z.literal("terms"),
    /**
     * Fields to be used for the terms operation
     */
    fields: z.array(z.string()),
    /**
     * Size of the terms operation
     */
    size: z.number().optional().default(5),
    /**
     * Whether to increase accuracy
     */
    increase_accuracy: z.boolean().optional(),
    /**
     * Includes
     */
    includes: z
      .object({
        values: z.array(z.string()),
        as_regex: z.boolean().optional()
      })
      .optional(),
    /**
     * Excludes
     */
    excludes: z
      .object({
        values: z.array(z.string()),
        as_regex: z.boolean().optional()
      })
      .optional(),
    /**
     * Other bucket
     */
    other_bucket: z
      .object({
        include_documents_without_field: z.boolean()
      })
      .optional(),
    /**
     * Rank by
     */
    rank_by: z.union([
      z.object({
        type: z.literal("alphabetical"),
        direction: z.union([z.literal("asc"), z.literal("desc")])
      }),
      z.object({
        type: z.literal("rare"),
        max: z.number()
      }),
      z.object({
        type: z.literal("significant")
      }),
      z.object({
        type: z.literal("column"),
        metric: z.number(),
        direction: z.union([z.literal("asc"), z.literal("desc")])
      }),
      z.object({
        type: z.literal("custom"),
        operation: z.literal("field-op-only"),
        field: z.string(),
        direction: z.union([z.literal("asc"), z.literal("desc")])
      })
    ])
  }),
  z.object({
    operation: z.literal("filters"),
    /**
     * Filters
     */
    filters: z.array(filterSchema)
  }),
  z.object({
    operation: z.literal("histogram"),
    /**
     * Field to be used for the histogram
     */
    field: z.string(),
    /**
     * Granularity of the histogram
     */
    granularity: z
      .number()
      .min(1)
      .max(7),
    /**
     * Whether to include empty rows
     */
    include_empty_rows: z.boolean().optional()
  }),
  z.object({
    operation: z.literal("range"),
    /**
     * Field to be used for the range
     */
    field: z.string(),
    /**
     * Ranges
     */
    ranges: z.array(
      z.object({
        lte: z.number().optional(),
        gt: z.number().optional(),
        label: z.string().optional()
      })
    )
  })
])

export const formulaLikeOperationDefinitionSchema = z.union([
  z.object({
    operation: z.literal("static_value"),
    /**
     * Static value
     */
    value: z.number()
  }),
  z.object({
    operation: z.literal("formula"),
    /**
     * Formula
     */
    formula: z.string(),
  }).and(genericOperationOptionsSchema)
])

/**
 * Color by value
 */
const colorByValueSchema = z.object({
  type: z.literal("dynamic"),
  min: z.number(),
  max: z.number(),
  range: z.union([z.literal("absolute"), z.literal("percentage")]),
  steps: z.array(
    z.union([
      z.object({
        type: z.literal("from"),
        from: z.number(),
        color: z.string()
      }),
      z.object({
        type: z.literal("full"),
        from: z.number(),
        to: z.number(),
        color: z.string()
      }),
      z.object({
        type: z.literal("to"),
        to: z.number(),
        color: z.string()
      })
    ])
  )
})

const staticColorSchema = z.object({
  type: z.literal("static"),
  code: z.string()
})

const colorDefinitionSchema = z.object({
  categorical: z
    .object({
      index: z.number(),
      palette: z.string().optional()
    })
    .optional(),
  static: z.string().optional()
})

const colorMappingSchema = z.union([
  z.object({
    palette: z.string(),
    mode: z.literal("categorical"),
    colorMapping: z
      .object({
        values: z.array(z.string())
      })
      .and(z.array(colorDefinitionSchema)),
    otherColors: colorDefinitionSchema
  }),
  z.object({
    palette: z.string(),
    mode: z.literal("gradient"),
    gradient: z.array(colorDefinitionSchema),
    colorMapping: z.array(
      z.object({
        values: z.array(z.string())
      })
    ),
    otherColors: colorDefinitionSchema
  })
])

const sharedLegendOptionsSchema = z.object({
  truncate_after_lines: z.literal(2).optional(),
  visible: z
    .union([z.literal("auto"), z.literal("show"), z.literal("hide")])
    .optional(),
  size: z
    .union([
      z.literal("auto"),
      z.literal("small"),
      z.literal("medium"),
      z.literal("large"),
      z.literal("xlarge")
    ])
    .optional().default('auto'),
})

export const coloringTypeSchema = z.union([
  colorByValueSchema,
  staticColorSchema
])

export const operationSharedSchema = z.object({
  /**
   * Time scale
   */
  time_scale: z.string().optional(),
  /**
   * Reduced time range
   */
  reduced_time_range: z.string().optional(),
  /**
   * Time shift
   */
  time_shift: z.string().optional(),
  /**
   * Filters
   */
  filter: filterSchema.optional()
})

export const fieldBasedOperationSharedSchema = operationSharedSchema.and(z.object({
  /**
   * Field to be used for the metric
   */
  field: z.string(),
}))

const emptyAsNullSchema = z.object({
  /**
   * Whether to consider null values as null
   */
  empty_as_null: z.boolean().optional()
})

export const fieldMetricOperationsSchema = z.union([
  z.object({
    operation: z.literal("count"),
    /**
     * Field to be used for the metric
     */
    field: z.string().optional(),
  }).and(operationSharedSchema).and(emptyAsNullSchema),
  z.object({
    operation: z.literal("unique_values"),
    /**
     * Whether to consider null values as null
     */
    empty_as_null: z.boolean().optional(),
  }).and(fieldBasedOperationSharedSchema),
  z.object({
    operation: z.union([
      z.literal("min"),
      z.literal("max"),
      z.literal("sum"),
      z.literal("median")
    ]),
    field: z.string(),
  }).and(fieldBasedOperationSharedSchema),
  z.object({
    operation: z.literal("last_value"),
    field: z.string(),
    sorting_field: z.string(),
    show_array_values: z.boolean().optional(),
  }).and(fieldBasedOperationSharedSchema),
  z.object({
    operation: z.literal("percentile"),
    field: z.string(),
    percentile: z.number().optional(),
  }).and(fieldBasedOperationSharedSchema),
  z.object({
    operation: z.literal("percentile_ranks"),
    field: z.string(),
    rank: z.number(),
  }).and(fieldBasedOperationSharedSchema)
])

const advancedMetricOperationsSchema = z.union([
  z.object({
    operation: z.literal("differences"),
    of: fieldMetricOperationsSchema,
  }).and(genericOperationOptionsSchema),
  z.object({
    operation: z.literal("moving_average"),
    of: fieldMetricOperationsSchema,
    window: z.number().optional(),
  }).and(genericOperationOptionsSchema),
  z.object({
    operation: z.literal("cumulative_sum"),
    field: z.string(),
  }).and(genericOperationOptionsSchema),
  z.object({
    operation: z.literal("counter_rate"),
    field: z.string(),
  }).and(genericOperationOptionsSchema)
])

/**
 * Metric operations
 */
export const metricOperationDefinitionSchema = z
  .union([fieldMetricOperationsSchema, advancedMetricOperationsSchema])
  .and(genericOperationOptionsSchema)

/**
 * Complementary visualization
 */
export const complementaryVizSchema = z.union([
  z.object({
    type: z.literal("bar"),
    /**
     * Direction of the bar
     */
    direction: z
      .union([z.literal("vertical"), z.literal("horizontal")])
      .optional().default('vertical'),
    /**
     * Goal value
     */
    goal_value: z.union([
      metricOperationDefinitionSchema,
      formulaLikeOperationDefinitionSchema
    ])
  }),
  z.object({
    type: z.literal("trend")
  })
])

export const metricStateSchema = z.object({
  /**
   * Type of the chart
   */
  type: z.literal("metric"),
  /**
   * Dataset to be used for the chart
   */
  dataset: datasetTypeSchema,
  /**
   * Primary value configuration
   */
  primary_value: z
    .union([
      metricOperationDefinitionSchema,
      formulaLikeOperationDefinitionSchema
    ])
    .and(
      z.object({
        /**
         * Sub label
         */
        sub_label: z.literal("Static text here").optional(),
        /**
         * Alignments
         */
        alignments: z
          .object({
            /**
             * Alignments for labels
             */
            labels: z.union([
              z.literal("left"),
              z.literal("center"),
              z.literal("right")
            ]).optional().default('left'),
            /**
             * Alignments for value
             */
            value: z.union([
              z.literal("left"),
              z.literal("center"),
              z.literal("right")
            ]).optional().default('left'),
          })
          .optional(),
        /**
         * Whether to fit the value
         */
        fit: z.boolean().optional(),
        /**
         * Icon configuration
         */
        icon: z
          .object({
            /**
             * Icon name
             */
            name: z.string(),
            /**
             * Icon alignment
             */
            align: z.union([z.literal("right"), z.literal("left")]).optional().default('right'),
          })
          .optional(),
        /**
         * Color configuration
         */
        color: coloringTypeSchema.optional(),
        /**
         * Complementary visualization
         */
        background_chart: complementaryVizSchema.optional()
      })
    ),
  /**
   * Secondary value configuration
   */
  secondary_value: z
    .union([
      metricOperationDefinitionSchema,
      formulaLikeOperationDefinitionSchema
    ])
    .and(
      z.object({
        /**
         * Prefix
         */
        prefix: z.string().optional(),
        /**
         * Compare to
         */
        compare_to: z
          .object({
            palette: z.string(),
            icon: z.boolean().optional(),
            value: z.boolean().optional(),
            baseline: z.union([z.literal(0), z.literal("primary")])
          })
          .optional()
      })
    ).optional(),
  /**
   * Breakdown by configuration
   */
  breakdown_by: bucketOperationDefinitionSchema.and(
    z.object({
      /**
       * Number of columns
       */
      columns: z.number(),
      /**
       * Collapse by
       */
      collapse_by: collapseBySchema
    })
  ).optional()
})

export const legacyMetricStateSchema = z.object({
  type: z.literal("legacy_metric"),
  dataset: datasetTypeSchema,
  value: z
    .union([
      metricOperationDefinitionSchema,
      formulaLikeOperationDefinitionSchema
    ])
    .and(
      z.object({
        color: coloringTypeSchema.and(
          z.object({
            mode: z.union([z.literal("background"), z.literal("text")])
          })
        ),
        size: z
          .union([
            z.literal("xxs"),
            z.literal("xs"),
            z.literal("s"),
            z.literal("m"),
            z.literal("l"),
            z.literal("xl"),
            z.literal("xxl")
          ])
          .optional(),
        alignment: z
          .object({
            label: z.union([z.literal("top"), z.literal("bottom")]).optional(),
            value: z
              .union([
                z.literal("right"),
                z.literal("center"),
                z.literal("left")
              ])
              .optional()
          })
          .optional()
      })
    )
})

export const pieChartStateSchema = z.object({
  type: z.union([
    z.literal("pie"),
    z.literal("treemap"),
    z.literal("waffle"),
    z.literal("mosaic")
  ]),
  dataset: datasetTypeSchema,
  legend: sharedLegendOptionsSchema.and(
    z.object({
      nested: z.boolean().optional(),
      values: z.tuple([z.literal("absolute")]).optional()
    })
  ),
  value_display: z
    .object({
      mode: z.union([
        z.literal("hidden"),
        z.literal("absolute"),
        z.literal("percentage")
      ]),
      percent_decimals: z.number().optional()
    })
    .optional(),
  label_position: z
    .union([z.literal("hidden"), z.literal("inside"), z.literal("outside")])
    .optional(),
  donut_hole: z
    .union([
      z.literal("none"),
      z.literal("small"),
      z.literal("medium"),
      z.literal("large")
    ])
    .optional(),
  metrics: z.array(
    z
      .union([
        metricOperationDefinitionSchema,
        formulaLikeOperationDefinitionSchema
      ])
      .and(
        z.object({
          color: staticColorSchema.optional(),
          format: formatTypeSchema.optional()
        })
      )
  ),
  group_by: z.array(bucketOperationDefinitionSchema)
})

export const waffleChartStateSchema = z.object({
  type: z.literal("waffle"),
  dataset: datasetTypeSchema,
  legend: sharedLegendOptionsSchema.and(
    z.object({
      values: z.tuple([z.literal("absolute")]).optional()
    })
  ),
  value_display: z
    .object({
      mode: z.union([
        z.literal("hidden"),
        z.literal("absolute"),
        z.literal("percentage")
      ]),
      percent_decimals: z.number().optional()
    })
    .optional(),
  metrics: z.array(
    z
      .union([
        metricOperationDefinitionSchema,
        formulaLikeOperationDefinitionSchema
      ])
      .and(
        z.object({
          color: staticColorSchema.optional(),
          format: formatTypeSchema.optional()
        })
      )
  ),
  group_by: z
    .array(bucketOperationDefinitionSchema)
    .min(1)
    .max(1)
})

export const treemapChartStateSchema = z.object({
  type: z.union([z.literal("treemap"), z.literal("mosaic")]),
  dataset: datasetTypeSchema,
  legend: sharedLegendOptionsSchema.and(
    z.object({
      nested: z.boolean().optional()
    })
  ),
  value_display: z
    .object({
      mode: z.union([
        z.literal("hidden"),
        z.literal("absolute"),
        z.literal("percentage")
      ]),
      percent_decimals: z.number().optional()
    })
    .optional(),
  label_position: z
    .union([z.literal("hidden"), z.literal("visible")])
    .optional(),
  metrics: z.array(
    z
      .union([
        metricOperationDefinitionSchema,
        formulaLikeOperationDefinitionSchema
      ])
      .and(
        z.object({
          color: staticColorSchema.optional(),
          format: formatTypeSchema.optional()
        })
      )
  ),
  group_by: z.array(bucketOperationDefinitionSchema)
})

const partitionChartStatesSchema = z.union([
  pieChartStateSchema,
  waffleChartStateSchema,
  treemapChartStateSchema
])

const tableChartStateSchema = z.object({
  type: z.literal("datatable"),
  dataset: datasetTypeSchema,
  density: z.object({
    mode: z
      .union([
        z.literal("compact"),
        z.literal("default"),
        z.literal("extended")
      ])
      .optional(),
    height: z
      .object({
        header: z
          .union([
            z.object({
              type: z.literal("auto")
            }),
            z.object({
              type: z.literal("custom"),
              lines: z.literal(10)
            })
          ])
          .optional(),
        value: z
          .union([
            z.object({
              type: z.literal("auto")
            }),
            z.object({
              type: z.literal("custom"),
              lines: z.literal(10)
            })
          ])
          .optional()
      })
      .optional()
  }),
  paging: z
    .union([
      z.literal(10),
      z.literal(20),
      z.literal(30),
      z.literal(50),
      z.literal(100)
    ])
    .optional(),
  columns: z.array(
    z.union([
      z
        .union([
          metricOperationDefinitionSchema,
          formulaLikeOperationDefinitionSchema
        ])
        .and(
          z.object({
            color: colorByValueSchema.and(
              z.object({
                mode: z.union([z.literal("text"), z.literal("background")])
              })
            ),
            alignment: z
              .union([
                /**
                 * Left aligns label to the left
                 */
                z.literal("left"),
                /**
                 * Right aligns label to the right
                 */
                z.literal("right"),
                /**
                 * Center aligns label to the center
                 */
                z.literal("center")
              ])
              .optional(),
            summary: z
              .union([
                z.literal("none"),
                z.literal("sum"),
                z.literal("avg"),
                z.literal("count"),
                z.literal("min"),
                z.literal("max")
              ])
              .optional()
          })
        ),
      bucketOperationDefinitionSchema.and(
        z.object({
          color: colorMappingSchema.optional(),
          collapse_by: collapseBySchema.optional(),
          sorted: z.object({
            direction: z.union([z.literal("asc"), z.literal("desc")])
          })
        })
      ),
      bucketOperationDefinitionSchema.and(
        z.object({
          color: colorMappingSchema.optional(),
          transposed: z.literal(true),
          sorted: z.object({
            direction: z.union([z.literal("asc"), z.literal("desc")]),
            value: z.string()
          })
        })
      )
    ])
  )
})

const flattenChartStatesSchema = z.union([
  metricStateSchema,
  legacyMetricStateSchema,
  partitionChartStatesSchema,
  tableChartStateSchema
])

export const lensApiStateSchema = sharedPanelInfoSchema
  .and(layerSettingsSchema)
  .and(flattenChartStatesSchema)


export type SharedPanelInfo = z.infer<typeof sharedPanelInfoSchema>;
export type LayerSettings = z.infer<typeof layerSettingsSchema>;
export type LensApiState = z.infer<typeof lensApiStateSchema>;

export type MetricState = z.infer<typeof metricStateSchema> & LayerSettings & SharedPanelInfo;

export type FormulaLikeOperationDefinition = z.infer<typeof formulaLikeOperationDefinitionSchema>;

export type NarrowByType<T, U> = T extends { type: U } ? T : never;
