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
  genericOperationOptionsSchema,
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
import {
  collapseBySchema,
  dslOnlyPanelInfoSchema,
  layerSettingsSchema,
  sharedPanelInfoSchema,
} from '../shared';

const compareToSchemaShared = schema.object({
  palette: schema.maybe(schema.string({ meta: { description: 'Palette' } })),
  icon: schema.maybe(schema.boolean({ meta: { description: 'Show icon' }, defaultValue: true })),
  value: schema.maybe(schema.boolean({ meta: { description: 'Show value' }, defaultValue: true })),
});

export const complementaryVizSchema = schema.oneOf(
  [
    schema.object(
      {
        type: schema.literal('bar'),
        /**
         * Direction of the bar. Possible values:
         * - 'vertical': Bar is oriented vertically
         * - 'horizontal': Bar is oriented horizontally
         */
        direction: schema.maybe(
          schema.oneOf([schema.literal('vertical'), schema.literal('horizontal')], {
            meta: {
              description:
                'Direction of the bar chart in the background visualization. Possible values: vertical (default) or horizontal',
            },
          })
        ),
        /**
         * Goal value
         */
        goal_value: metricOperationDefinitionSchema,
      },
      {
        meta: {
          description:
            'Bar chart background visualization with configurable direction and goal value',
        },
      }
    ),
    schema.object(
      {
        type: schema.literal('trend'),
      },
      {
        meta: {
          description: 'Trend line background visualization showing historical data patterns',
        },
      }
    ),
  ],
  {
    meta: {
      description:
        'Complementary visualization displayed behind the primary metric value. Supports bar charts with direction and goal value, or trend lines showing data patterns over time',
    },
  }
);

const metricStatePrimaryMetricOptionsSchema = schema.object(
  {
    /**
     * Sub label
     */
    sub_label: schema.maybe(
      schema.string({
        meta: {
          description:
            'Sub label - Additional descriptive text displayed below the main metric value',
        },
      })
    ),
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
            meta: {
              description:
                'Alignment for labels in the primary metric. Possible values: left, center, right',
            },
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
            meta: {
              description:
                'Alignment for values in the primary metric. Possible values: left, center, right',
            },
            defaultValue: 'left',
          }
        ),
      },
      {
        defaultValue: { labels: 'left', value: 'left' },
        meta: {
          description:
            'Configure alignment of labels and values for the primary metric. For example, align labels to the left and values to the right',
        },
      }
    ),
    /**
     * Whether to fit the value
     */
    fit: schema.boolean({
      meta: {
        description:
          'Whether to fit the value - automatically adjusts the display size to fit the content',
      },
      defaultValue: false,
    }),
    /**
     * Icon configuration
     */
    icon: schema.maybe(
      schema.object(
        {
          /**
           * Icon name
           */
          name: schema.string({
            meta: {
              description: 'Icon name - the name of the icon to display with the metric',
            },
          }),
          /**
           * Icon alignment. Possible values:
           * - 'right': Icon is aligned to the right
           * - 'left': Icon is aligned to the left
           */
          align: schema.oneOf([schema.literal('right'), schema.literal('left')], {
            meta: {
              description:
                'Icon alignment - position of the icon relative to the metric value. Possible values: right (default), left',
            },
            defaultValue: 'right',
          }),
        },
        {
          meta: {
            description: 'Icon configuration for the primary metric',
          },
        }
      )
    ),
    /**
     * Color configuration
     */
    color: schema.maybe(coloringTypeSchema),
    /**
     * Where to apply the color (background or value)
     */
    apply_color_to: schema.maybe(
      schema.oneOf([schema.literal('background'), schema.literal('value')], {
        meta: {
          description:
            'Where to apply the color - either to the background or the value text. Possible values: background, value',
        },
      })
    ),
    /**
     * Complementary visualization
     */
    background_chart: schema.maybe(complementaryVizSchema),
  },
  {
    meta: {
      description:
        'Configuration options for the primary metric display including alignment, styling, and background visualization',
    },
  }
);

const metricStateSecondaryMetricOptionsSchema = schema.object(
  {
    /**
     * Prefix
     */
    prefix: schema.maybe(
      schema.string({
        meta: {
          description: 'Prefix - text displayed before the secondary metric value',
        },
      })
    ),
    /**
     * Compare to
     */
    compare: schema.maybe(
      schema.oneOf(
        [
          schema.allOf([
            compareToSchemaShared,
            schema.object(
              {
                to: schema.literal('baseline'),
                baseline: schema.number({
                  meta: {
                    description: 'Baseline value - the reference value for comparison calculations',
                  },
                  defaultValue: 0,
                }),
              },
              {
                meta: {
                  description: 'Compare secondary metric to a baseline value',
                },
              }
            ),
          ]),
          schema.allOf([
            compareToSchemaShared,
            schema.object(
              {
                to: schema.literal('primary'),
              },
              {
                meta: {
                  description: 'Compare secondary metric to the primary metric value',
                },
              }
            ),
          ]),
        ],
        {
          meta: {
            description:
              'Comparison configuration for the secondary metric. Can compare to baseline value or primary metric',
          },
        }
      )
    ),
    /**
     * Color configuration
     */
    color: schema.maybe(coloringTypeSchema),
  },
  {
    meta: {
      description:
        'Configuration options for the secondary metric display including prefix, comparison settings, and styling',
    },
  }
);

const metricStateBreakdownByOptionsSchema = schema.object(
  {
    /**
     * Number of columns
     */
    columns: schema.number({
      defaultValue: 5,
      meta: {
        description:
          'Number of columns - maximum number of columns to display in the breakdown. Must be a positive integer, recommended range: 1-20',
      },
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
  },
  {
    meta: {
      description:
        'Configuration for breaking down the metric into multiple columns with optional collapsing behavior. When number of breakdown items exceeds columns, collapse_by determines how to aggregate the excess items',
    },
  }
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
    metric: schema.oneOf(
      [
        // oneOf allows only 12 items
        // so break down metrics based on the type: field-based, reference-based, formula-like
        schema.oneOf(
          [
            schema.allOf([metricStatePrimaryMetricOptionsSchema, countMetricOperationSchema]),
            schema.allOf([metricStatePrimaryMetricOptionsSchema, uniqueCountMetricOperationSchema]),
            schema.allOf([metricStatePrimaryMetricOptionsSchema, metricOperationSchema]),
            schema.allOf([metricStatePrimaryMetricOptionsSchema, sumMetricOperationSchema]),
            schema.allOf([metricStatePrimaryMetricOptionsSchema, lastValueOperationSchema]),
            schema.allOf([metricStatePrimaryMetricOptionsSchema, percentileOperationSchema]),
            schema.allOf([metricStatePrimaryMetricOptionsSchema, percentileRanksOperationSchema]),
          ],
          {
            meta: {
              description:
                'Field-based metric operations - operations that work directly on field values',
            },
          }
        ),
        schema.oneOf(
          [
            schema.allOf([metricStatePrimaryMetricOptionsSchema, differencesOperationSchema]),
            schema.allOf([metricStatePrimaryMetricOptionsSchema, movingAverageOperationSchema]),
            schema.allOf([metricStatePrimaryMetricOptionsSchema, cumulativeSumOperationSchema]),
            schema.allOf([metricStatePrimaryMetricOptionsSchema, counterRateOperationSchema]),
          ],
          {
            meta: {
              description:
                'Reference-based metric operations - operations that compare against previous values or time periods',
            },
          }
        ),
        schema.oneOf(
          [
            schema.allOf([metricStatePrimaryMetricOptionsSchema, staticOperationDefinitionSchema]),
            schema.allOf([metricStatePrimaryMetricOptionsSchema, formulaOperationDefinitionSchema]),
          ],
          {
            meta: {
              description:
                'Formula-like metric operations - static values or calculated expressions',
            },
          }
        ),
      ],
      {
        meta: {
          description:
            'Primary value configuration - defines the main metric operation and display options. Must define exactly one operation type. Supports field-based, reference-based, and formula-like operations',
        },
      }
    ),
    /**
     * Secondary value configuration, must define operation.
     */
    secondary_metric: schema.maybe(
      schema.oneOf(
        [
          // oneOf allows only 12 items
          // so break down metrics based on the type: field-based, reference-based, formula-like
          schema.oneOf(
            [
              schema.allOf([metricStateSecondaryMetricOptionsSchema, countMetricOperationSchema]),
              schema.allOf([
                metricStateSecondaryMetricOptionsSchema,
                uniqueCountMetricOperationSchema,
              ]),
              schema.allOf([metricStateSecondaryMetricOptionsSchema, metricOperationSchema]),
              schema.allOf([metricStateSecondaryMetricOptionsSchema, sumMetricOperationSchema]),
              schema.allOf([metricStateSecondaryMetricOptionsSchema, lastValueOperationSchema]),
              schema.allOf([metricStateSecondaryMetricOptionsSchema, percentileOperationSchema]),
              schema.allOf([
                metricStateSecondaryMetricOptionsSchema,
                percentileRanksOperationSchema,
              ]),
            ],
            {
              meta: {
                description: 'Field-based secondary metric operations',
              },
            }
          ),
          schema.oneOf(
            [
              schema.allOf([metricStateSecondaryMetricOptionsSchema, differencesOperationSchema]),
              schema.allOf([metricStateSecondaryMetricOptionsSchema, movingAverageOperationSchema]),
              schema.allOf([metricStateSecondaryMetricOptionsSchema, cumulativeSumOperationSchema]),
              schema.allOf([metricStateSecondaryMetricOptionsSchema, counterRateOperationSchema]),
            ],
            {
              meta: {
                description: 'Reference-based secondary metric operations',
              },
            }
          ),
          schema.oneOf(
            [
              schema.allOf([
                metricStateSecondaryMetricOptionsSchema,
                staticOperationDefinitionSchema,
              ]),
              schema.allOf([
                metricStateSecondaryMetricOptionsSchema,
                formulaOperationDefinitionSchema,
              ]),
            ],
            {
              meta: {
                description: 'Formula-like secondary metric operations',
              },
            }
          ),
        ],
        {
          meta: {
            description:
              'Secondary value configuration - optional additional metric with comparison capabilities',
          },
        }
      )
    ),
    /**
     * Configure how to break down the metric (e.g. show one metric per term).
     */
    breakdown_by: schema.maybe(
      schema.oneOf(
        [
          schema.allOf([metricStateBreakdownByOptionsSchema, bucketDateHistogramOperationSchema]),
          schema.allOf([metricStateBreakdownByOptionsSchema, bucketTermsOperationSchema]),
          schema.allOf([metricStateBreakdownByOptionsSchema, bucketHistogramOperationSchema]),
          schema.allOf([metricStateBreakdownByOptionsSchema, bucketRangesOperationSchema]),
          schema.allOf([metricStateBreakdownByOptionsSchema, bucketFiltersOperationSchema]),
        ],
        {
          meta: {
            description:
              'Breakdown configuration - splits the metric into multiple columns based on different criteria (date_histogram, terms, histogram, ranges, filters)',
          },
        }
      )
    ),
  },
  {
    meta: {
      description:
        'Metric visualization state configuration for non-ESQL data sources. Requires exactly one primary metric operation. Secondary metric and breakdown are optional',
    },
  }
);

const esqlMetricState = schema.object(
  {
    type: schema.literal('metric'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetEsqlTableSchema,
    /**
     * Primary value configuration, must define operation.
     */
    metric: schema.allOf(
      [
        schema.object(genericOperationOptionsSchema),
        metricStatePrimaryMetricOptionsSchema,
        esqlColumnSchema,
      ],
      {
        meta: {
          description:
            'Primary value configuration for ESQL data sources - defines the main metric operation and display options. Uses ESQL column references instead of field names',
        },
      }
    ),
    /**
     * Secondary value configuration, must define operation.
     */
    secondary_metric: schema.maybe(
      schema.allOf(
        [
          schema.object(genericOperationOptionsSchema),
          metricStateSecondaryMetricOptionsSchema,
          esqlColumnSchema,
        ],
        {
          meta: {
            description:
              'Secondary value configuration for ESQL data sources - optional additional metric with comparison capabilities',
          },
        }
      )
    ),
    /**
     * Configure how to break down the metric (e.g. show one metric per term).
     */
    breakdown_by: schema.maybe(
      schema.allOf([metricStateBreakdownByOptionsSchema, esqlColumnSchema], {
        meta: {
          description:
            'Breakdown configuration for ESQL data sources - splits the metric into multiple columns based on ESQL column values',
        },
      })
    ),
  },
  {
    meta: {
      description:
        'Metric visualization state configuration for ESQL data sources. Uses ESQL column references instead of field names. All operations must reference columns from the ESQL query result',
    },
  }
);

export const metricStateSchema = schema.oneOf([metricStateSchemaNoESQL, esqlMetricState], {
  meta: {
    description:
      'Metric visualization state configuration - supports both traditional data sources and ESQL queries. Traditional metrics use field names, ESQL metrics use column names',
  },
});

export type MetricState = TypeOf<typeof metricStateSchema>;
export type MetricStateNoESQL = TypeOf<typeof metricStateSchemaNoESQL>;
export type MetricStateESQL = TypeOf<typeof esqlMetricState>;
