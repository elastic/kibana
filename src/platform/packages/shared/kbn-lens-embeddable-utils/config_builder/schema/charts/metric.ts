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
  esqlColumnWithFormatSchema,
} from '../metric_ops';
import { staticColorSchema, applyColorToSchema, colorByValueSchema } from '../color';
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
  metricValuePositionSchema,
  leftRightAlignmentSchema,
  placementSchema,
} from '../alignments';
import { builderEnums } from '../enums';

const compareToSchemaShared = schema.object(
  {
    palette: schema.maybe(schema.string({ meta: { description: 'Palette' } })),
    icon: schema.maybe(schema.boolean({ meta: { description: 'Show icon' }, defaultValue: true })),
    value: schema.maybe(
      schema.boolean({ meta: { description: 'Show value' }, defaultValue: true })
    ),
  },
  { meta: { id: 'metricChartCompareToShared', title: 'Compare To Shared' } }
);

const barBackgroundChartSchema = schema.object({
  type: schema.literal('bar'),
  /**
   * Direction of the bar. Possible values:
   * - 'vertical': Bar is oriented vertically
   * - 'horizontal': Bar is oriented horizontally
   */
  orientation: schema.maybe(builderEnums.simpleOrientation()),
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
  { meta: { id: 'metricComplementaryBar', title: 'Complementary Bar' } }
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
  labels: schema.object(
    {
      /**
       * Alignment for labels. Possible values:
       * - 'left': Align label to the left
       * - 'center': Align label to the center
       * - 'right': Align label to the right
       */
      alignment: horizontalAlignmentSchema({
        meta: { description: 'Alignment for labels' },
        defaultValue: LENS_METRIC_STATE_DEFAULTS.titlesTextAlign,
      }),
    },
    {
      meta: { description: 'Labels configuration' },
    }
  ),
  /**
   * Values configuration
   */
  value: schema.object(
    {
      /**
       * Alignment for values. Possible values:
       * - 'left': Align value to the left
       * - 'center': Align value to the center
       * - 'right': Align value to the right
       */
      alignment: horizontalAlignmentSchema({
        meta: { description: 'Alignment for values' },
        defaultValue: LENS_METRIC_STATE_DEFAULTS.primaryAlign,
      }),
    },
    {
      meta: { description: 'Values configuration' },
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
        alignment: leftRightAlignmentSchema({
          meta: { description: 'Icon alignment' },
          defaultValue: LENS_METRIC_STATE_DEFAULTS.iconAlign,
        }),
      },
      {
        meta: {
          id: 'metricIconConfig',
          title: 'Icon Configuration',
          description: 'Icon configuration for primary metric',
        },
      }
    )
  ),
  /**
   * Color configuration
   */
  color: schema.maybe(schema.oneOf([colorByValueSchema, staticColorSchema])),
  /**
   * Where to apply the color (background or value)
   */
  apply_color_to: schema.maybe(applyColorToSchema),
  /**
   * Position of the primary metric value. Possible values:
   * - 'top': Value appears above the labels
   * - 'middle': Value appears between the labels
   * - 'bottom': Value appears below the labels
   */
  position: schema.maybe(
    metricValuePositionSchema({
      meta: { description: 'Position of the primary metric value (top, middle, or bottom)' },
      defaultValue: LENS_METRIC_STATE_DEFAULTS.primaryPosition,
    })
  ),
  /**
   * Font weight for title and subtitle. Possible values:
   * - 'bold': Bold font weight
   * - 'normal': Normal font weight
   */
  title_weight: schema.maybe(
    schema.oneOf([schema.literal('bold'), schema.literal('normal')], {
      meta: { description: 'Font weight for title and subtitle' },
    })
  ),
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
   * Label placement relative to the secondary metric value. Possible values:
   * - 'before': Label appears before the value
   * - 'after': Label appears after the value
   */
  placement: placementSchema({
    meta: { description: 'Label placement relative to the secondary metric value' },
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
        { meta: { id: 'metricCompareToBaseline', title: 'Compare To Baseline' } }
      ),
      compareToSchemaShared.extends(
        {
          to: schema.literal('primary'),
        },
        { meta: { id: 'metricCompareToPrimary', title: 'Compare To Primary' } }
      ),
    ])
  ),
  value: schema.maybe(
    schema.object(
      {
        /**
         * Alignment for secondary values. Possible values:
         * - 'left': Align value to the left
         * - 'center': Align value to the center
         * - 'right': Align value to the right
         */
        alignment: horizontalAlignmentSchema({
          meta: { description: 'Alignment for secondary values' },
          defaultValue: LENS_METRIC_STATE_DEFAULTS.secondaryAlign,
        }),
      },
      { meta: { description: 'Value configuration' } }
    )
  ),
  /**
   * Color configuration
   */
  color: schema.maybe(staticColorSchema),
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

export const metricStateSchemaNoESQL = schema.object(
  {
    type: schema.literal('metric'),
    ...sharedPanelInfoSchema,
    ...dslOnlyPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetSchema,
    /**
     * Primary value configuration, must define operation.
     */
    metrics: schema.arrayOf(
      schema.oneOf([primaryMetricSchemaNoESQL, secondaryMetricSchemaNoESQL]),
      {
        minSize: 1,
        maxSize: 2,
        validate: validateMetrics,
      }
    ),
    /**
     * Configure how to break down the metric (e.g. show one metric per term).
     */
    breakdown_by: schema.maybe(
      mergeAllBucketsWithChartDimensionSchema(metricStateBreakdownByOptionsSchema)
    ),
  },
  {
    meta: {
      id: 'metricNoESQL',
      title: 'Metric Chart (DSL)',
      description: 'Metric chart configuration for standard queries',
    },
  }
);

const primaryMetricESQL = esqlColumnWithFormatSchema
  .extends(metricStatePrimaryMetricOptionsSchema)
  .extends(metricStateBackgroundChartSchemaESQL);

const secondaryMetricESQL = esqlColumnWithFormatSchema.extends(
  metricStateSecondaryMetricOptionsSchema
);

export const esqlMetricState = schema.object(
  {
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
    breakdown_by: schema.maybe(
      esqlColumnWithFormatSchema.extends(metricStateBreakdownByOptionsSchema)
    ),
  },
  {
    meta: {
      id: 'metricESQL',
      title: 'Metric Chart (ES|QL)',
      description: 'Metric chart configuration for ES|QL queries',
    },
  }
);

export const metricStateSchema = schema.oneOf([metricStateSchemaNoESQL, esqlMetricState], {
  meta: { id: 'metricChart', title: 'Metric Chart' },
  validate: ({ metrics, breakdown_by }) => {
    const primaryMetric = metrics.find((metric) => isPrimaryMetric(metric));

    if (primaryMetric?.color?.type === 'dynamic' && primaryMetric.color.range === 'percentage') {
      if (!breakdown_by && !(primaryMetric.background_chart?.type === 'bar')) {
        return 'When using percentage-based dynamic coloring, a breakdown dimension or max must be defined.';
      }
    }
  },
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
