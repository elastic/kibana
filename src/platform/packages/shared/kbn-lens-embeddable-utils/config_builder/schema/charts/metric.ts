import { schema } from '@kbn/config-schema';
import { countMetricOperationSchema, counterRateOperationSchema, cumulativeSumOperationSchema, differencesOperationSchema, formulaOperationDefinitionSchema, lastValueOperationSchema, metricOperationDefinitionSchema, metricOperationSchema, movingAverageOperationSchema, percentileOperationSchema, percentileRanksOperationSchema, staticOperationDefinitionSchema, uniqueValuesMetricOperationSchema } from '../metric_ops';
import { coloringTypeSchema } from '../color';
import { datasetSchema } from '../dataset';
import { bucketDateHistogramOperationSchema, bucketTermsOperationSchema, bucketHistogramOperationSchema, bucketRangesOperationSchema, bucketFilterOperationSchema } from '../bucket_ops';
import { collapseBySchema, layerSettingsSchema, sharedPanelInfoSchema } from '../shared';

export const complementaryVizSchema = schema.oneOf([
  schema.object({
    type: schema.literal("bar"),
    /**
     * Direction of the bar. Possible values:
     * - 'vertical': Bar is oriented vertically
     * - 'horizontal': Bar is oriented horizontally
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
   * Alignments of the labels and values for the primary metric.
   * For example, align the labels to the left and the values to the right.
   */
  alignments: schema.maybe(schema.object({
    /**
     * Alignments for labels. Possible values:
     * - 'left': Align label to the left
     * - 'center': Align label to the center
     * - 'right': Align label to the right
     */
    labels: schema.maybe(schema.oneOf([
      schema.literal("left"),
      schema.literal("center"),
      schema.literal("right")
    ], { meta: { description: 'Alignments for labels' } })),
    /**
     * Alignments for value. Possible values:
     * - 'left': Align value to the left
     * - 'center': Align value to the center
     * - 'right': Align value to the right
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
     * Icon alignment. Possible values:
     * - 'right': Icon is aligned to the right
     * - 'left': Icon is aligned to the left
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
  columns: schema.maybe(schema.number({ 
    defaultValue: 5, 
    meta: { description: 'Number of columns' } 
  })),
  /**
     * Collapse by function. This parameter is used to collapse the
     * metric chart when the number of columns is bigger than the
     * number of columns specified in the columns parameter.
     * Possible values:
     * - 'avg': Collapse by average
     * - 'sum': Collapse by sum
     * - 'max': Collapse by max
     * - 'min': Collapse by min
     * - 'none': Do not collapse
     */
  collapse_by: schema.maybe(collapseBySchema)
});



export const metricStateSchema = schema.object({
  type: schema.literal("metric"),
  ...datasetSchema.getPropSchemas(),
  /**
   * Primary value configuration, must define operation.
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
   * Secondary value configuration, must define operation.
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
   * Configure how to break down the metric (e.g. show one metric per term).
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