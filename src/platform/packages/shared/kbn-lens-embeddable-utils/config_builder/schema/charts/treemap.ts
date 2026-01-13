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
import { esqlColumnSchema, genericOperationOptionsSchema } from '../metric_ops';
import { colorByValueSchema, colorMappingSchema, staticColorSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';

import { collapseBySchema, layerSettingsSchema, sharedPanelInfoSchema } from '../shared';
import {
  legendNestedSchema,
  legendSizeSchema,
  legendTruncateAfterLinesSchema,
  legendVisibleSchema,
  valueDisplaySchema,
} from './partition_shared';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
} from './shared';

const treemapSharedStateSchema = {
  legend: schema.maybe(
    schema.object(
      {
        nested: legendNestedSchema,
        truncate_after_lines: legendTruncateAfterLinesSchema,
        visible: legendVisibleSchema,
        size: legendSizeSchema,
      },
      {
        meta: {
          description: 'Configuration for the treemap chart legend appearance and behavior',
        },
      }
    )
  ),
  value_display: valueDisplaySchema,

  /**
   * Position of the labels: hidden or visible
   */
  label_position: schema.maybe(
    schema.oneOf([schema.literal('hidden'), schema.literal('visible')], {
      meta: {
        description: 'Position of the labels: hidden or visible',
      },
    })
  ),
};

const partitionStatePrimaryMetricOptionsSchema = schema.object(
  {
    /**
     * Color configuration
     */
    color: schema.maybe(staticColorSchema),
  },
  {
    meta: {
      description:
        'Configuration options for primary metric values in a treemap partition, including static color settings',
    },
  }
);

const partitionStateBreakdownByOptionsSchema = schema.object(
  {
    /**
     * Color configuration: static color, color by value, or color mapping
     */
    color: schema.maybe(
      schema.oneOf([colorByValueSchema, colorMappingSchema], {
        meta: {
          description: 'Color configuration: static color, color by value, or color mapping',
        },
      })
    ),
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
        'Configuration options for breakdown dimensions in a treemap partition, including color settings and collapse behavior',
    },
  }
);

export const treemapStateSchemaNoESQL = schema.object(
  {
    type: schema.literal('treemap'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetSchema,
    ...treemapSharedStateSchema,
    /**
     * Primary value configuration, must define operation. Supports field-based operations (count, unique count, metrics, sum, last value, percentile, percentile ranks), reference-based operations (differences, moving average, cumulative sum, counter rate), and formula-like operations (static value, formula).
     */
    metrics: schema.arrayOf(
      schema.oneOf(
        [
          // oneOf allows only 12 items
          // so break down metrics based on the type: field-based, reference-based, formula-like
          schema.oneOf(
            [
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, countMetricOperationSchema], {
                meta: {
                  description: 'Count metric operation with primary metric options',
                },
              }),
              schema.allOf(
                [partitionStatePrimaryMetricOptionsSchema, uniqueCountMetricOperationSchema],
                {
                  meta: {
                    description: 'Unique count metric operation with primary metric options',
                  },
                }
              ),
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, metricOperationSchema], {
                meta: {
                  description:
                    'Generic metric operation (min, max, avg) with primary metric options',
                },
              }),
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, sumMetricOperationSchema], {
                meta: {
                  description: 'Sum metric operation with primary metric options',
                },
              }),
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, lastValueOperationSchema], {
                meta: {
                  description: 'Last value metric operation with primary metric options',
                },
              }),
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, percentileOperationSchema], {
                meta: {
                  description: 'Percentile metric operation with primary metric options',
                },
              }),
              schema.allOf(
                [partitionStatePrimaryMetricOptionsSchema, percentileRanksOperationSchema],
                {
                  meta: {
                    description: 'Percentile ranks metric operation with primary metric options',
                  },
                }
              ),
            ],
            {
              meta: {
                description: 'Field-based metric operations',
              },
            }
          ),
          schema.oneOf(
            [
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, differencesOperationSchema], {
                meta: {
                  description: 'Differences operation with primary metric options',
                },
              }),
              schema.allOf(
                [partitionStatePrimaryMetricOptionsSchema, movingAverageOperationSchema],
                {
                  meta: {
                    description: 'Moving average operation with primary metric options',
                  },
                }
              ),
              schema.allOf(
                [partitionStatePrimaryMetricOptionsSchema, cumulativeSumOperationSchema],
                {
                  meta: {
                    description: 'Cumulative sum operation with primary metric options',
                  },
                }
              ),
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, counterRateOperationSchema], {
                meta: {
                  description: 'Counter rate operation with primary metric options',
                },
              }),
            ],
            {
              meta: {
                description: 'Reference-based metric operations',
              },
            }
          ),
          schema.oneOf(
            [
              schema.allOf(
                [partitionStatePrimaryMetricOptionsSchema, staticOperationDefinitionSchema],
                {
                  meta: {
                    description: 'Static value operation with primary metric options',
                  },
                }
              ),
              schema.allOf(
                [partitionStatePrimaryMetricOptionsSchema, formulaOperationDefinitionSchema],
                {
                  meta: {
                    description: 'Formula operation with primary metric options',
                  },
                }
              ),
            ],
            {
              meta: {
                description: 'Formula-like metric operations',
              },
            }
          ),
        ],
        {
          meta: {
            description:
              'Metric operation configuration supporting field-based, reference-based, and formula-like operations',
          },
        }
      ),
      { minSize: 1 }
    ),
    /**
     * Configure how to break down the metric (e.g. show one metric per term). Supports date histogram, terms, histogram, ranges, and filters operations.
     */
    group_by: schema.arrayOf(
      schema.maybe(
        schema.oneOf(
          [
            schema.allOf(
              [partitionStateBreakdownByOptionsSchema, bucketDateHistogramOperationSchema],
              {
                meta: {
                  description:
                    'Date histogram bucket operation for breaking down metrics over time',
                },
              }
            ),
            schema.allOf([partitionStateBreakdownByOptionsSchema, bucketTermsOperationSchema], {
              meta: {
                description: 'Terms bucket operation for breaking down metrics by field values',
              },
            }),
            schema.allOf([partitionStateBreakdownByOptionsSchema, bucketHistogramOperationSchema], {
              meta: {
                description:
                  'Histogram bucket operation for breaking down metrics by numeric intervals',
              },
            }),
            schema.allOf([partitionStateBreakdownByOptionsSchema, bucketRangesOperationSchema], {
              meta: {
                description:
                  'Ranges bucket operation for breaking down metrics by custom numeric ranges',
              },
            }),
            schema.allOf([partitionStateBreakdownByOptionsSchema, bucketFiltersOperationSchema], {
              meta: {
                description:
                  'Filters bucket operation for breaking down metrics by custom query filters',
              },
            }),
          ],
          {
            meta: {
              description: 'Bucket operation configuration for breaking down metrics by dimensions',
            },
          }
        )
      ),
      { minSize: 1 }
    ),
  },
  {
    meta: {
      description:
        'Treemap chart configuration schema for data source queries (non-ES|QL mode), defining metrics and breakdown dimensions',
    },
  }
);

const treemapStateSchemaESQL = schema.object(
  {
    type: schema.literal('treemap'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetEsqlTableSchema,
    ...treemapSharedStateSchema,
    /**
     * Primary value configuration, must define operation. In ES|QL mode, uses column-based configuration.
     */
    metrics: schema.allOf(
      [
        schema.object(genericOperationOptionsSchema),
        partitionStatePrimaryMetricOptionsSchema,
        esqlColumnSchema,
      ],
      {
        meta: {
          description:
            'Metric configuration for ES|QL mode, combining generic options, primary metric options, and column selection',
        },
      }
    ),
    /**
     * Configure how to break down the metric (e.g. show one metric per term). In ES|QL mode, uses column-based configuration.
     */
    group_by: schema.maybe(
      schema.allOf([partitionStateBreakdownByOptionsSchema, esqlColumnSchema], {
        meta: {
          description:
            'Breakdown dimension configuration for ES|QL mode, combining breakdown options with column selection',
        },
      })
    ),
  },
  {
    meta: {
      description:
        'Treemap chart configuration schema for ES|QL queries, defining metrics and breakdown dimensions using column-based configuration',
    },
  }
);

export const treemapStateSchema = schema.oneOf([treemapStateSchemaNoESQL, treemapStateSchemaESQL], {
  meta: {
    description:
      'Treemap chart configuration schema supporting both data source queries (non-ES|QL) and ES|QL query modes',
  },
});

export type TreemapState = TypeOf<typeof treemapStateSchema>;
export type TreemapStateNoESQL = TypeOf<typeof treemapStateSchemaNoESQL>;
export type TreemapStateESQL = TypeOf<typeof treemapStateSchemaESQL>;
