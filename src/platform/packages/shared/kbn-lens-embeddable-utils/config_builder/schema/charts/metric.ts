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
  metricOperationDefinitionSchema,
  esqlColumnSchema,
  genericOperationOptionsSchema,
} from '../metric_ops';
import { colorByValueAbsolute, staticColorSchema, applyColorToSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import {
  collapseBySchema,
  layerSettingsSchemaRaw,
  sharedPanelInfoSchema,
  dslOnlyPanelInfoSchema,
} from '../shared';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
} from './shared';
import { horizontalAlignmentSchema, leftRightAlignmentSchema } from '../alignments';

const compareToSchemaShared = schema.object({
  palette: schema.maybe(schema.string({ meta: { description: 'Palette' } })),
  icon: schema.maybe(schema.boolean({ meta: { description: 'Show icon' }, defaultValue: true })),
  value: schema.maybe(schema.boolean({ meta: { description: 'Show value' }, defaultValue: true })),
});

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
      labels: horizontalAlignmentSchema({
        meta: { description: 'Alignments for labels' },
        defaultValue: 'left',
      }),
      /**
       * Alignments for value. Possible values:
       * - 'left': Align value to the left
       * - 'center': Align value to the center
       * - 'right': Align value to the right
       */
      value: horizontalAlignmentSchema({
        meta: { description: 'Alignments for value' },
        defaultValue: 'left',
      }),
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
      align: leftRightAlignmentSchema({
        meta: { description: 'Icon alignment' },
        defaultValue: 'right',
      }),
    })
  ),
  /**
   * Color configuration
   */
  color: schema.maybe(schema.oneOf([colorByValueAbsolute, staticColorSchema])),
  /**
   * Where to apply the color (background or value)
   */
  apply_color_to: schema.maybe(applyColorToSchema),
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
  compare: schema.maybe(
    schema.oneOf([
      schema.allOf([
        compareToSchemaShared,
        schema.object({
          to: schema.literal('baseline'),
          baseline: schema.number({ meta: { description: 'Baseline value' }, defaultValue: 0 }),
        }),
      ]),
      schema.allOf([
        compareToSchemaShared,
        schema.object({
          to: schema.literal('primary'),
        }),
      ]),
    ])
  ),
  /**
   * Color configuration
   */
  color: schema.maybe(schema.oneOf([colorByValueAbsolute, staticColorSchema])),
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
  id: schema.maybe(schema.string()),
  type: schema.literal('metric'),
  ...sharedPanelInfoSchema,
  ...dslOnlyPanelInfoSchema,
  ...layerSettingsSchemaRaw,
  ...datasetSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metric: mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
    metricStatePrimaryMetricOptionsSchema
  ),
  /**
   * Secondary value configuration, must define operation.
   */
  secondary_metric: schema.maybe(
    mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(metricStateSecondaryMetricOptionsSchema)
  ),
  /**
   * Configure how to break down the metric (e.g. show one metric per term).
   */
  breakdown_by: schema.maybe(
    mergeAllBucketsWithChartDimensionSchema(metricStateBreakdownByOptionsSchema)
  ),
});

export const esqlMetricState = schema.object({
  type: schema.literal('metric'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchemaRaw,
  ...datasetEsqlTableSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metric: schema.allOf([
    schema.object(genericOperationOptionsSchema),
    metricStatePrimaryMetricOptionsSchema,
    esqlColumnSchema,
  ]),
  /**
   * Secondary value configuration, must define operation.
   */
  secondary_metric: schema.maybe(
    schema.allOf([
      schema.object(genericOperationOptionsSchema),
      metricStateSecondaryMetricOptionsSchema,
      esqlColumnSchema,
    ])
  ),
  /**
   * Configure how to break down the metric (e.g. show one metric per term).
   */
  breakdown_by: schema.maybe(schema.allOf([metricStateBreakdownByOptionsSchema, esqlColumnSchema])),
});

export const metricStateSchema = schema.oneOf([metricStateSchemaNoESQL, esqlMetricState]);

export type MetricState = TypeOf<typeof metricStateSchema>;
export type MetricStateNoESQL = TypeOf<typeof metricStateSchemaNoESQL>;
export type MetricStateESQL = TypeOf<typeof esqlMetricState>;
