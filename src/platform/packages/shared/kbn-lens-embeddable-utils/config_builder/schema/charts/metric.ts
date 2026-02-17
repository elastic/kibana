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
  LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS,
  LENS_METRIC_STATE_DEFAULTS,
} from '@kbn/lens-common';
import {
  metricOperationDefinitionSchema,
  esqlColumnSchema,
  esqlColumnOperationWithLabelAndFormatSchema,
} from '../metric_ops';
import { colorByValueAbsolute, staticColorSchema, applyColorToSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import {
  collapseBySchema,
  layerSettingsSchema,
  sharedPanelInfoSchema,
  dslOnlyPanelInfoSchema,
} from '../shared';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
} from './shared';
import {
  horizontalAlignmentSchema,
  leftRightAlignmentSchema,
  beforeAfterAlignmentSchema,
} from '../alignments';

const compareToSchemaShared = schema.object(
  {
    palette: schema.maybe(schema.string({ meta: { description: 'Palette' } })),
    icon: schema.maybe(schema.boolean({ meta: { description: 'Show icon' }, defaultValue: true })),
    value: schema.maybe(
      schema.boolean({ meta: { description: 'Show value' }, defaultValue: true })
    ),
  },
  { meta: { id: 'metricChartCompareToShared' } }
);

const barBackgroundChartSchema = schema.object({
  type: schema.literal('bar'),
  /**
   * Direction of the bar. Possible values:
   * - 'vertical': Bar is oriented vertically
   * - 'horizontal': Bar is oriented horizontally
   */
  direction: schema.maybe(schema.oneOf([schema.literal('vertical'), schema.literal('horizontal')])),
});

export const complementaryVizSchemaNoESQL = schema.oneOf([
  barBackgroundChartSchema.extends({
    /**
     * Max value
     */
    max_value: metricOperationDefinitionSchema,
  }),
  schema.object({
    type: schema.literal('trend'),
  }),
]);

// Note: 'trend' type is not supported for ES|QL yet
export const complementaryVizSchemaESQL = barBackgroundChartSchema.extends(
  {
    /**
     * Max value
     */
    max_value: esqlColumnSchema,
  },
  { meta: { id: 'metricComplementaryBar' } }
);

const metricStateBackgroundChartSchemaNoESQL = {
  /**
   * Complementary visualization
   */
  background_chart: schema.maybe(complementaryVizSchemaNoESQL),
};

const metricStateBackgroundChartSchemaESQL = {
  /**
   * Complementary visualization
   */
  background_chart: schema.maybe(complementaryVizSchemaESQL),
};

const metricStatePrimaryMetricOptionsSchema = {
  // this is used to differentiate primary and secondary metrics
  // unfortunately given the lack of tuple schema support we need to have some way
  // to avoid default injection in the wrong type
  type: schema.literal('primary'),
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
        defaultValue: LENS_METRIC_STATE_DEFAULTS.titlesTextAlign,
      }),
      /**
       * Alignments for value. Possible values:
       * - 'left': Align value to the left
       * - 'center': Align value to the center
       * - 'right': Align value to the right
       */
      value: horizontalAlignmentSchema({
        meta: { description: 'Alignments for value' },
        defaultValue: LENS_METRIC_STATE_DEFAULTS.primaryAlign,
      }),
    },
    {
      defaultValue: {
        labels: LENS_METRIC_STATE_DEFAULTS.titlesTextAlign,
        value: LENS_METRIC_STATE_DEFAULTS.primaryAlign,
      },
      meta: { id: 'metricPrimaryMetricAlignments' },
    }
  ),
  /**
   * Whether to fit the value
   */
  fit: schema.boolean({ meta: { description: 'Whether to fit the value' }, defaultValue: false }),
  /**
   * Icon configuration
   */
  icon: schema.maybe(
    schema.object(
      {
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
          defaultValue: LENS_METRIC_STATE_DEFAULTS.iconAlign,
        }),
      },
      { meta: { id: 'metricIconConfig', description: 'Icon configuration for primary metric' } }
    )
  ),
  /**
   * Color configuration
   */
  color: schema.maybe(schema.oneOf([colorByValueAbsolute, staticColorSchema])),
  /**
   * Where to apply the color (background or value)
   */
  apply_color_to: schema.maybe(applyColorToSchema),
};

const metricStateSecondaryMetricOptionsSchema = {
  // this is used to differentiate primary and secondary metrics
  // unfortunately given the lack of tuple schema support we need to have some way
  // to avoid default injection in the wrong type
  type: schema.literal('secondary'),
  /**
   * Prefix
   */
  prefix: schema.maybe(schema.string({ meta: { description: 'Prefix' } })),
  /**
   * Label position relative to the secondary metric value. Possible values:
   * - 'before': Label appears before the value
   * - 'after': Label appears after the value
   */
  label_position: beforeAfterAlignmentSchema({
    meta: { description: 'Label position relative to the secondary metric value' },
    defaultValue: LENS_METRIC_STATE_DEFAULTS.secondaryLabelPosition,
  }),
  /**
   * Compare to
   */
  compare: schema.maybe(
    schema.oneOf([
      compareToSchemaShared.extends(
        {
          to: schema.literal('baseline'),
          baseline: schema.number({ meta: { description: 'Baseline value' }, defaultValue: 0 }),
        },
        { meta: { id: 'metricCompareToBaseline' } }
      ),
      compareToSchemaShared.extends(
        {
          to: schema.literal('primary'),
        },
        { meta: { id: 'metricCompareToPrimary' } }
      ),
    ])
  ),
  /**
   * Color configuration
   */
  color: schema.maybe(schema.oneOf([colorByValueAbsolute, staticColorSchema])),
};

const metricStateBreakdownByOptionsSchema = {
  /**
   * Number of columns
   */
  columns: schema.number({
    defaultValue: LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS,
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
};

function isSecondaryMetric(
  metric: PrimaryMetricType | SecondaryMetricType
): metric is SecondaryMetricType {
  return metric.type === 'secondary';
}

function isPrimaryMetric(
  metric: PrimaryMetricType | SecondaryMetricType
): metric is PrimaryMetricType {
  return metric.type === 'primary';
}

function validateMetrics(metrics: (PrimaryMetricType | SecondaryMetricType)[]) {
  const [firstMetric, secondMetric] = metrics;
  if (secondMetric) {
    const isFirstSecondary = isSecondaryMetric(firstMetric);
    const isSecondPrimary = isPrimaryMetric(secondMetric);
    if (isFirstSecondary || isSecondPrimary) {
      return 'When two metrics are defined, the primary metric must be the first item and the secondary metric the second item.';
    }
  }
  const isFirstSecondary = isSecondaryMetric(firstMetric);
  if (isFirstSecondary) {
    return 'The first metric must be the primary metric.';
  }
}

const primaryMetricSchemaNoESQL = mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps({
  ...metricStatePrimaryMetricOptionsSchema,
  ...metricStateBackgroundChartSchemaNoESQL,
});
const secondaryMetricSchemaNoESQL = mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
  metricStateSecondaryMetricOptionsSchema
);

export const metricStateSchemaNoESQL = schema.object({
  type: schema.literal('metric'),
  ...sharedPanelInfoSchema,
  ...dslOnlyPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metrics: schema.arrayOf(schema.oneOf([primaryMetricSchemaNoESQL, secondaryMetricSchemaNoESQL]), {
    minSize: 1,
    maxSize: 2,
    validate: validateMetrics,
  }),
  /**
   * Configure how to break down the metric (e.g. show one metric per term).
   */
  breakdown_by: schema.maybe(
    mergeAllBucketsWithChartDimensionSchema(metricStateBreakdownByOptionsSchema)
  ),
});

const primaryMetricESQL = esqlColumnOperationWithLabelAndFormatSchema
  .extends(metricStatePrimaryMetricOptionsSchema)
  .extends(metricStateBackgroundChartSchemaESQL);

const secondaryMetricESQL = esqlColumnOperationWithLabelAndFormatSchema.extends(
  metricStateSecondaryMetricOptionsSchema
);

export const esqlMetricState = schema.object({
  type: schema.literal('metric'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metrics: schema.arrayOf(schema.oneOf([primaryMetricESQL, secondaryMetricESQL]), {
    minSize: 1,
    maxSize: 2,
    validate: validateMetrics,
  }),
  /**
   * Configure how to break down the metric (e.g. show one metric per term).
   */
  breakdown_by: schema.maybe(esqlColumnSchema.extends(metricStateBreakdownByOptionsSchema)),
});

export const metricStateSchema = schema.oneOf([metricStateSchemaNoESQL, esqlMetricState], {
  meta: { id: 'metricChartSchema' },
});

export type MetricState = TypeOf<typeof metricStateSchema>;
export type MetricStateNoESQL = TypeOf<typeof metricStateSchemaNoESQL>;
export type MetricStateESQL = TypeOf<typeof esqlMetricState>;

export type PrimaryMetricType =
  | TypeOf<typeof primaryMetricSchemaNoESQL>
  | TypeOf<typeof primaryMetricESQL>;
export type SecondaryMetricType =
  | TypeOf<typeof secondaryMetricSchemaNoESQL>
  | TypeOf<typeof secondaryMetricESQL>;
