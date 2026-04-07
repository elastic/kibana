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
import { LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS } from '@kbn/lens-common';
import {
  DEFAULT_PRIMARY_POSITION,
  DEFAULT_PRIMARY_LABELS_ALIGNMENT,
  DEFAULT_PRIMARY_VALUE_ALIGNMENT,
  DEFAULT_PRIMARY_VALUE_SIZING,
  DEFAULT_PRIMARY_ICON_ALIGNMENT,
  DEFAULT_SECONDARY_LABEL_VISIBLE,
  DEFAULT_SECONDARY_LABEL_PLACEMENT,
  DEFAULT_SECONDARY_VALUE_ALIGNMENT,
} from '../../transforms/charts/metric/defaults';
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

const metricStylingSchema = schema.object(
  {
    primary: schema.maybe(
      schema.object({
        /**
         * Position of the primary metric value. Possible values:
         * - 'top': Value appears above the labels
         * - 'middle': Value appears between the labels
         * - 'bottom': Value appears below the labels
         */
        position: schema.maybe(
          metricValuePositionSchema({
            meta: { description: 'Position of the primary metric value (top, middle, or bottom)' },
            defaultValue: DEFAULT_PRIMARY_POSITION,
          })
        ),
        /**
         * Title and subtitle text configuration for the primary metric.
         */
        labels: schema.maybe(
          schema.object(
            {
              /**
               * Horizontal alignment for the title and subtitle text. Possible values:
               * - 'left': Align to the left
               * - 'center': Align to the center
               * - 'right': Align to the right
               */
              alignment: schema.maybe(
                horizontalAlignmentSchema({
                  meta: {
                    description:
                      'Horizontal alignment for the title and subtitle text (left, center or right)',
                  },
                  defaultValue: DEFAULT_PRIMARY_LABELS_ALIGNMENT,
                })
              ),
            },
            {
              meta: { description: 'Labels (title and subtitle) configuration' },
            }
          )
        ),
        /**
         * Values configuration
         */
        value: schema.maybe(
          schema.object(
            {
              /**
               * Alignment for values. Possible values:
               * - 'left': Align value to the left
               * - 'center': Align value to the center
               * - 'right': Align value to the right
               */
              alignment: schema.maybe(
                horizontalAlignmentSchema({
                  meta: {
                    description: 'Alignment for the primary metric value (left, center or right)',
                  },
                  defaultValue: DEFAULT_PRIMARY_VALUE_ALIGNMENT,
                })
              ),
              /**
               * Controls how the primary value text is sized within the panel.
               * - 'auto': selects a font size from predefined breakpoints based on panel height,
               *   then shrinks if the text overflows horizontally.
               * - 'fill': scales the text to be as large as possible, filling all available space.
               */
              sizing: schema.maybe(
                schema.oneOf([schema.literal('auto'), schema.literal('fill')], {
                  defaultValue: DEFAULT_PRIMARY_VALUE_SIZING,
                  meta: {
                    description:
                      "Controls how the primary value text is sized within the panel. 'auto' selects a font size from predefined breakpoints based on panel height, then shrinks if the text overflows horizontally. 'fill' scales the text to be as large as possible, filling all available space.",
                  },
                })
              ),
            },
            {
              meta: { description: 'Primary metric value configuration' },
            }
          )
        ),
        /**
         * Icon configuration
         */
        icon: schema.maybe(
          schema.object(
            {
              /**
               * Icon name
               */
              name: schema.oneOf(
                [
                  schema.literal('alert'),
                  schema.literal('asterisk'),
                  schema.literal('bell'),
                  schema.literal('bolt'),
                  schema.literal('bug'),
                  schema.literal('compute'),
                  schema.literal('editor_comment'),
                  schema.literal('flag'),
                  schema.literal('globe'),
                  schema.literal('heart'),
                  schema.literal('map_marker'),
                  schema.literal('pin'),
                  schema.literal('sort_down'),
                  schema.literal('sort_up'),
                  schema.literal('star_empty'),
                  schema.literal('tag'),
                  schema.literal('temperature'),
                ],
                { meta: { description: 'Icon name' } }
              ),
              /**
               * Icon alignment. Possible values:
               * - 'right': Icon is aligned to the right
               * - 'left': Icon is aligned to the left
               */
              alignment: schema.maybe(
                leftRightAlignmentSchema({
                  meta: { description: 'Icon alignment' },
                  defaultValue: DEFAULT_PRIMARY_ICON_ALIGNMENT,
                })
              ),
            },
            {
              meta: {
                id: 'metricIconConfig',
                title: 'Icon Configuration',
                description: 'Icon configuration for the primary metric',
              },
            }
          )
        ),
      })
    ),
    secondary: schema.maybe(
      schema.object({
        /**
         * Label configuration
         */
        label: schema.maybe(
          schema.object({
            /**
             * Whether to display the label
             */
            visible: schema.maybe(
              schema.boolean({
                meta: { description: 'Whether to display the label' },
                defaultValue: DEFAULT_SECONDARY_LABEL_VISIBLE,
              })
            ),
            /**
             * Label placement relative to the secondary metric value. Possible values:
             * - 'before': Label appears before the value
             * - 'after': Label appears after the value
             */
            placement: schema.maybe(
              placementSchema({
                meta: {
                  description:
                    'Label placement relative to the secondary metric value (before or after)',
                },
                defaultValue: DEFAULT_SECONDARY_LABEL_PLACEMENT,
              })
            ),
          })
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
              alignment: schema.maybe(
                horizontalAlignmentSchema({
                  meta: { description: 'Alignment for secondary values (left, center or right)' },
                  defaultValue: DEFAULT_SECONDARY_VALUE_ALIGNMENT,
                })
              ),
            },
            { meta: { description: 'Secondary metric value configuration' } }
          )
        ),
      })
    ),
  },
  {
    meta: {
      id: 'metricStyling',
      description: 'Visual styling options for the chart',
    },
  }
);

const metricStatePrimaryMetricOptionsSchema = {
  // this is used to differentiate primary and secondary metrics
  // unfortunately given the lack of tuple schema support we need to have some way
  // to avoid default injection in the wrong type
  type: schema.literal('primary'),
  /**
   * Subtitle
   */
  subtitle: schema.maybe(
    schema.string({ meta: { description: 'Subtitle below the primary metric value' } })
  ),
  /**
   * Color configuration
   */
  color: schema.maybe(schema.oneOf([colorByValueSchema, staticColorSchema])),
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
    styling: schema.maybe(metricStylingSchema),
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
    styling: schema.maybe(metricStylingSchema),
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

export type MetricStyling = TypeOf<typeof metricStylingSchema>;

export type PrimaryMetricType =
  | TypeOf<typeof primaryMetricSchemaNoESQL>
  | TypeOf<typeof primaryMetricESQL>;
export type SecondaryMetricType =
  | TypeOf<typeof secondaryMetricSchemaNoESQL>
  | TypeOf<typeof secondaryMetricESQL>;
