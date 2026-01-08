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

const partitionStatePrimaryMetricOptionsSchema = schema.object({
  /**
   * Color configuration
   */
  color: schema.maybe(staticColorSchema),
});

const partitionStateBreakdownByOptionsSchema = schema.object({
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
});

function validateGroupings(obj: {
  metrics: unknown[];
  group_by?: Array<{ collapse_by?: unknown }>;
}) {
  if (obj.metrics.length > 1) {
    if ((obj.group_by?.filter((def) => def.collapse_by == null).length ?? 0) > 1) {
      return 'When using multiple metrics, the number of group by dimensions must not exceed 1 (collapsed dimensions do not count).';
    }
  }
  if ((obj.group_by?.filter((def) => def.collapse_by == null).length ?? 0) > 2) {
    return 'The number of non-collapsed group by dimensions must not exceed 2.';
  }
}

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
      mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
        partitionStatePrimaryMetricOptionsSchema
      ),
      {
        minSize: 1,
        maxSize: 100,
        meta: {
          description: 'Array of metric configurations: minimum 1 (recommended).',
        },
      }
    ),
    /**
     * Configure how to break down the metric (e.g. show one metric per term). Supports date histogram, terms, histogram, ranges, and filters operations.
     */
    group_by: schema.maybe(
      schema.arrayOf(
        mergeAllBucketsWithChartDimensionSchema(partitionStateBreakdownByOptionsSchema),
        {
          minSize: 1,
          maxSize: 100,
          meta: {
            description: 'Array of grouping dimensions (minimum 1, maximum 2 for non collapsed).',
          },
        }
      )
    ),
  },
  {
    meta: {
      description:
        'Treemap chart configuration schema for data source queries (non-ES|QL mode), defining metrics and breakdown dimensions',
    },
    validate: validateGroupings,
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
    metrics: schema.arrayOf(
      schema.allOf(
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
      {
        minSize: 1,
        maxSize: 100,
        meta: {
          description: 'Array of metric configurations: minimum 1 (recommended)',
        },
      }
    ),
    /**
     * Configure how to break down the metric (e.g. show one metric per term). In ES|QL mode, uses column-based configuration.
     */
    group_by: schema.maybe(
      schema.arrayOf(
        schema.allOf([partitionStateBreakdownByOptionsSchema, esqlColumnSchema], {
          meta: {
            description:
              'Breakdown dimension configuration for ES|QL mode, combining breakdown options with column selection',
          },
        }),
        {
          minSize: 1,
          maxSize: 100,
          meta: {
            description: 'Array of grouping dimensions (minimum 1, maximum 2 for non collapsed).',
          },
        }
      )
    ),
  },
  {
    meta: {
      description:
        'Treemap chart configuration schema for ES|QL queries, defining metrics and breakdown dimensions using column-based configuration',
    },
    validate: validateGroupings,
  }
);

export const treemapStateSchema = schema.oneOf([treemapStateSchemaNoESQL, treemapStateSchemaESQL], {
  meta: {
    description: 'Treemap chart configuration: DSL or ES|QL query based',
  },
});

export type TreemapState = TypeOf<typeof treemapStateSchema>;
export type TreemapStateNoESQL = TypeOf<typeof treemapStateSchemaNoESQL>;
export type TreemapStateESQL = TypeOf<typeof treemapStateSchemaESQL>;
