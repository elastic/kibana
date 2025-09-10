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
import {
  countMetricOperationSchema,
  counterRateOperationSchema,
  cumulativeSumOperationSchema,
  differencesOperationSchema,
  formulaOperationDefinitionSchema,
  lastValueOperationSchema,
  metricOperationDefinitionSchema,
  metricOperationSchema,
  movingAverageOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
  staticOperationDefinitionSchema,
  uniqueCountMetricOperationSchema,
  sumMetricOperationSchema,
  esqlColumnSchema,
} from '../metric_ops';
import { coloringTypeSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import {
  bucketDateHistogramOperationSchema,
  bucketTermsOperationSchema,
  bucketHistogramOperationSchema,
  bucketRangesOperationSchema,
  bucketFiltersOperationSchema,
} from '../bucket_ops';
import { collapseBySchema, layerSettingsSchema, sharedPanelInfoSchema } from '../shared';

export const complementaryVizSchema = schema.oneOf([
  schema.object({
    type: schema.literal('bar'),
    /**
     * Direction of the bar. Possible values:
     * - 'vertical': Bar is oriented vertically
     * - 'horizontal': Bar is oriented horizontally
     */
    direction: schema.maybe(
      schema.oneOf([schema.literal('vertical'), schema.literal('horizontal')])
    ),
    /**
     * Goal value
     */
    goal_value: metricOperationDefinitionSchema,
  }),
  schema.object({
    type: schema.literal('trend'),
  }),
]);

const metricStatePrimaryMetricOptionsSchema = schema.object({
  /**
   * Sub label
   */
  sub_label: schema.maybe(schema.string({ meta: { description: 'Sub label' } })),
  /**
   * Alignments of the labels and values for the primary metric.
   * For example, align the labels to the left and the values to the right.
   */
  alignments: schema.object(
    {
      /**
       * Alignments for labels. Possible values:
       * - 'left': Align label to the left
       * - 'center': Align label to the center
       * - 'right': Align label to the right
       */
      labels: schema.oneOf(
        [schema.literal('left'), schema.literal('center'), schema.literal('right')],
        {
          meta: { description: 'Alignments for labels' },
          defaultValue: 'left',
        }
      ),
      /**
       * Alignments for value. Possible values:
       * - 'left': Align value to the left
       * - 'center': Align value to the center
       * - 'right': Align value to the right
       */
      value: schema.oneOf(
        [schema.literal('left'), schema.literal('center'), schema.literal('right')],
        {
          meta: { description: 'Alignments for value' },
          defaultValue: 'left',
        }
      ),
    },
    { defaultValue: { labels: 'left', value: 'left' } }
  ),
  /**
   * Whether to fit the value
   */
  fit: schema.boolean({ meta: { description: 'Whether to fit the value' }, defaultValue: false }),
  /**
   * Icon configuration
   */
  icon: schema.maybe(
    schema.object({
      /**
       * Icon name
       */
      name: schema.string({ meta: { description: 'Icon name' } }),
      /**
       * Icon alignment. Possible values:
       * - 'right': Icon is aligned to the right
       * - 'left': Icon is aligned to the left
       */
      align: schema.oneOf([schema.literal('right'), schema.literal('left')], {
        meta: { description: 'Icon alignment' },
        defaultValue: 'right',
      }),
    })
  ),
  /**
   * Color configuration
   */
  color: schema.maybe(coloringTypeSchema),
  /**
   * Complementary visualization
   */
  background_chart: schema.maybe(complementaryVizSchema),
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
  columns: schema.number({
    defaultValue: 5,
    meta: { description: 'Number of columns' },
  }),
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
  collapse_by: schema.maybe(collapseBySchema),
});

export const metricStateSchemaNoESQL = schema.object({
  type: schema.literal('metric'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metric: schema.oneOf([
    // oneOf allows only 12 items
    // so break down metrics based on the type: field-based, reference-based, formula-like
    schema.oneOf([
      schema.allOf([metricStatePrimaryMetricOptionsSchema, countMetricOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, uniqueCountMetricOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, metricOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, sumMetricOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, lastValueOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, percentileOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, percentileRanksOperationSchema]),
    ]),
    schema.oneOf([
      schema.allOf([metricStatePrimaryMetricOptionsSchema, differencesOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, movingAverageOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, cumulativeSumOperationSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, counterRateOperationSchema]),
    ]),
    schema.oneOf([
      schema.allOf([metricStatePrimaryMetricOptionsSchema, staticOperationDefinitionSchema]),
      schema.allOf([metricStatePrimaryMetricOptionsSchema, formulaOperationDefinitionSchema]),
    ]),
  ]),
  /**
   * Secondary value configuration, must define operation.
   */
  secondary_metric: schema.maybe(
    schema.oneOf([
      // oneOf allows only 12 items
      // so break down metrics based on the type: field-based, reference-based, formula-like
      schema.oneOf([
        schema.allOf([metricStateSecondaryMetricOptionsSchema, countMetricOperationSchema]),
        schema.allOf([metricStateSecondaryMetricOptionsSchema, uniqueCountMetricOperationSchema]),
        schema.allOf([metricStateSecondaryMetricOptionsSchema, metricOperationSchema]),
        schema.allOf([metricStateSecondaryMetricOptionsSchema, sumMetricOperationSchema]),
        schema.allOf([metricStateSecondaryMetricOptionsSchema, lastValueOperationSchema]),
        schema.allOf([metricStateSecondaryMetricOptionsSchema, percentileOperationSchema]),
        schema.allOf([metricStateSecondaryMetricOptionsSchema, percentileRanksOperationSchema]),
      ]),
      schema.oneOf([
        schema.allOf([metricStateSecondaryMetricOptionsSchema, differencesOperationSchema]),
        schema.allOf([metricStateSecondaryMetricOptionsSchema, movingAverageOperationSchema]),
        schema.allOf([metricStateSecondaryMetricOptionsSchema, cumulativeSumOperationSchema]),
        schema.allOf([metricStateSecondaryMetricOptionsSchema, counterRateOperationSchema]),
      ]),
      schema.oneOf([
        schema.allOf([metricStateSecondaryMetricOptionsSchema, staticOperationDefinitionSchema]),
        schema.allOf([metricStateSecondaryMetricOptionsSchema, formulaOperationDefinitionSchema]),
      ]),
    ])
  ),
  /**
   * Configure how to break down the metric (e.g. show one metric per term).
   */
  breakdown_by: schema.maybe(
    schema.oneOf([
      schema.allOf([metricStateBreakdownByOptionsSchema, bucketDateHistogramOperationSchema]),
      schema.allOf([metricStateBreakdownByOptionsSchema, bucketTermsOperationSchema]),
      schema.allOf([metricStateBreakdownByOptionsSchema, bucketHistogramOperationSchema]),
      schema.allOf([metricStateBreakdownByOptionsSchema, bucketRangesOperationSchema]),
      schema.allOf([metricStateBreakdownByOptionsSchema, bucketFiltersOperationSchema]),
    ])
  ),
});

const esqlMetricState = schema.object({
  type: schema.literal('metric'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metric: schema.allOf([metricStatePrimaryMetricOptionsSchema, esqlColumnSchema]),
  /**
   * Secondary value configuration, must define operation.
   */
  secondary_metric: schema.maybe(
    schema.allOf([metricStateSecondaryMetricOptionsSchema, esqlColumnSchema])
  ),
  /**
   * Configure how to break down the metric (e.g. show one metric per term).
   */
  breakdown_by: schema.maybe(schema.allOf([metricStateBreakdownByOptionsSchema, esqlColumnSchema])),
});

export const metricStateSchema = schema.oneOf([metricStateSchemaNoESQL, esqlMetricState]);

export type MetricState = TypeOf<typeof metricStateSchema>;
