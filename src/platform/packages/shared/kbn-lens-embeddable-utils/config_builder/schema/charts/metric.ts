import { schema } from '@kbn/config-schema';
import { countMetricOperationSchema, counterRateOperationSchema, cumulativeSumOperationSchema, differencesOperationSchema, formulaOperationDefinitionSchema, lastValueOperationSchema, metricOperationDefinitionSchema, metricOperationSchema, movingAverageOperationSchema, percentileOperationSchema, percentileRanksOperationSchema, staticOperationDefinitionSchema, uniqueValuesMetricOperationSchema } from '../metric_ops';
import { coloringTypeSchema } from '../color';
import { datasetTypeSchema } from '../dataset';
import { bucketDateHistogramOperationSchema, bucketTermsOperationSchema, bucketHistogramOperationSchema, bucketRangesOperationSchema, bucketFilterOperationSchema } from '../bucket_ops';
import { layerSettingsSchema, sharedPanelInfoSchema } from '../shared';


export const collapseBySchema = schema.oneOf([
  schema.literal('avg'),
  schema.literal('sum'),
  schema.literal('max'),
  schema.literal('min'),
  schema.literal('none'),
], { meta: { description: 'Collapse by' } });

/**
 * Complementary visualization
 */
export const complementaryVizSchema = schema.oneOf([
  schema.object({
    type: schema.literal("bar"),
    /**
     * Direction of the bar
     */
    direction: schema.maybe(
      schema.oneOf([schema.literal("vertical"), schema.literal("horizontal")]),
    ),
    /**
     * Goal value
     */
    goal_value: metricOperationDefinitionSchema
  }),
  schema.object({
    type: schema.literal("trend")
  })
])

const metricStatePrimaryMetricOptionsSchema = schema.object({
  /**
   * Sub label
   */
  sub_label: schema.maybe(schema.string({ meta: { description: 'Sub label' } })),
  /**
   * Alignments
   */
  alignments: schema.maybe(schema.object({
    /**
     * Alignments for labels
     */
    labels: schema.maybe(schema.oneOf([
      schema.literal("left"),
      schema.literal("center"),
      schema.literal("right")
    ], { meta: { description: 'Alignments for labels' } })),
    /**
     * Alignments for value
     */
    value: schema.maybe(schema.oneOf([
      schema.literal("left"),
      schema.literal("center"),
      schema.literal("right")
    ], { meta: { description: 'Alignments for value' } })),
  })),
  /**
   * Whether to fit the value
   */
  fit: schema.maybe(schema.boolean({ meta: { description: 'Whether to fit the value' } })),
  /**
   * Icon configuration
   */
  icon: schema.maybe(schema.object({
    /**
     * Icon name
     */
    name: schema.string({ meta: { description: 'Icon name' } }),
    /**
     * Icon alignment
     */
    align: schema.maybe(schema.oneOf([
      schema.literal("right"),
      schema.literal("left")
    ], { meta: { description: 'Icon alignment' } })),
  })),
  /**
   * Color configuration
   */
  color: schema.maybe(coloringTypeSchema),
  /**
   * Complementary visualization
   */
  background_chart: schema.maybe(complementaryVizSchema)
});

const metricStateSecondaryMetricOptionsSchema = schema.object({
  /**
   * Prefix
   */
  prefix: schema.maybe(schema.string({ meta: { description: 'Prefix' } })),
  /**
   * Compare to
   */
  compare_to: schema.maybe(schema.string({ meta: { description: 'Compare to' } })),
  /**
   * Color configuration
   */
  color: schema.maybe(coloringTypeSchema),
});

const metricStateBreakdownByOptionsSchema = schema.object({
  /**
         * Number of columns
         */
  columns: schema.number(),
  /**
   * Collapse by
   */
  collapse_by: collapseBySchema
});



export const metricStateSchema = schema.object({
  /**
   * Type of the chart
   */
  type: schema.literal("metric"),
  /**
   * Dataset to be used for the chart
   */
  dataset: datasetTypeSchema,
  /**
   * Primary value configuration
   */
  metric:
    schema.oneOf([
      schema.allOf([metricStatePrimaryMetricOptionsSchema, countMetricOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, uniqueValuesMetricOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, metricOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, lastValueOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, percentileOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, percentileRanksOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, differencesOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, movingAverageOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, cumulativeSumOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, counterRateOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, staticOperationDefinitionSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, formulaOperationDefinitionSchema]),
    ]),
  /**
   * Secondary value configuration
   */
  secondary_metric: schema.oneOf([
    schema.allOf([metricStateSecondaryMetricOptionsSchema, uniqueValuesMetricOperationSchema]),
    schema.allOf([metricStateSecondaryMetricOptionsSchema, metricOperationSchema]),
    schema.allOf([metricStateSecondaryMetricOptionsSchema, lastValueOperationSchema]),
    schema.allOf([metricStateSecondaryMetricOptionsSchema, percentileOperationSchema]),
    schema.allOf([metricStateSecondaryMetricOptionsSchema, percentileRanksOperationSchema]),
    schema.allOf([metricStateSecondaryMetricOptionsSchema, differencesOperationSchema]),
    schema.allOf([metricStateSecondaryMetricOptionsSchema, movingAverageOperationSchema]),
    schema.allOf([metricStateSecondaryMetricOptionsSchema, cumulativeSumOperationSchema]),
    schema.allOf([metricStateSecondaryMetricOptionsSchema, counterRateOperationSchema]),
    schema.allOf([metricStateSecondaryMetricOptionsSchema, staticOperationDefinitionSchema]),
    schema.allOf([metricStateSecondaryMetricOptionsSchema, formulaOperationDefinitionSchema]),
    schema.allOf([metricStateSecondaryMetricOptionsSchema, countMetricOperationSchema]),
  ]),
  /**
   * Configure how to break down the metric (e.g. show one metric per term)
   */
  breakdown_by: schema.maybe(
    schema.oneOf([
      schema.allOf([metricStateBreakdownByOptionsSchema, bucketDateHistogramOperationSchema]),
      schema.allOf([metricStateBreakdownByOptionsSchema, bucketTermsOperationSchema]),
      schema.allOf([metricStateBreakdownByOptionsSchema, bucketHistogramOperationSchema]),
      schema.allOf([metricStateBreakdownByOptionsSchema, bucketRangesOperationSchema]),
      schema.allOf([metricStateBreakdownByOptionsSchema, bucketFilterOperationSchema]),
    ])
  ),
  ...sharedPanelInfoSchema.getPropSchemas(),
  ...layerSettingsSchema.getPropSchemas()
});

export type MetricState = typeof metricStateSchema.type;