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
import { colorMappingSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import {
  collapseBySchema,
  dslOnlyPanelInfoSchema,
  layerSettingsSchema,
  sharedPanelInfoSchema,
} from '../shared';
import type { PartitionMetric } from './partition_shared';
import {
  legendNestedSchema,
  legendTruncateAfterLinesSchema,
  legendVisibleSchema,
  legendSizeSchema,
  valueDisplaySchema,
  validateGroupings,
} from './partition_shared';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
} from './shared';

const mosaicStateSharedSchema = {
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
          description: 'Legend configuration for mosaic chart appearance and behavior',
        },
      }
    )
  ),
  value_display: valueDisplaySchema,
};

const partitionStatePrimaryMetricOptionsSchema = schema.object({});

const partitionStateBreakdownByOptionsSchema = schema.object(
  {
    /**
     * Color configuration: static color, color by value, or color mapping
     */
    color: schema.maybe(colorMappingSchema),
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
        'Configuration options for breakdown dimensions in a mosaic partition, including color settings and collapse behavior',
    },
  }
);

export const mosaicStateSchemaNoESQL = schema.object(
  {
    type: schema.literal('mosaic'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetSchema,
    ...mosaicStateSharedSchema,
    ...dslOnlyPanelInfoSchema,
    /**
     * Primary value configuration, must define operation. Supports field-based operations (count, unique count, metrics, sum, last value, percentile, percentile ranks), reference-based operations (differences, moving average, cumulative sum, counter rate), and formula-like operations (static value, formula).
     */
    metrics: schema.arrayOf(
      mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
        partitionStatePrimaryMetricOptionsSchema
      ),
      {
        minSize: 1,
        maxSize: 1,
        meta: { description: 'Array of metric configurations (only 1 allowed)' },
      }
    ),
    group_by: schema.maybe(
      schema.arrayOf(
        mergeAllBucketsWithChartDimensionSchema(partitionStateBreakdownByOptionsSchema),
        {
          minSize: 1,
          maxSize: 100,
          meta: { description: 'Array of breakdown dimensions (minimum 1)' },
        }
      )
    ),

    /**
     * Unfortunately due to the collapsed feature, it is necessary to distinct between primary and secondary groups
     * at the api level as well.  Secondary groups are rendered inside the primary groups.
     * If no primary group is defined then the entire set is the primary group.
     */
    group_breakdown_by: schema.maybe(
      schema.arrayOf(
        mergeAllBucketsWithChartDimensionSchema(
          schema.object({ collapse_by: schema.maybe(collapseBySchema) })
        ),
        {
          minSize: 1,
          maxSize: 100,
          meta: { description: 'Array of group breakdown dimensions (minimum 1)' },
        }
      )
    ),
  },
  {
    meta: {
      description:
        'Mosaic chart configuration schema for data source queries (non-ES|QL mode), defining metrics and breakdown dimensions',
    },
    validate: ({
      metrics,
      group_by,
      group_breakdown_by,
    }: {
      metrics: Array<PartitionMetric>;
      group_by?: Array<{ collapse_by?: string }>;
      group_breakdown_by?: Array<{ collapse_by?: string }>;
    }) => {
      if (group_by && group_by.filter((def) => def.collapse_by == null).length > 1) {
        return 'Only a single non-collapsed dimension is allowed for group_by';
      }
      if (
        group_breakdown_by &&
        group_breakdown_by.filter((def) => def.collapse_by == null).length > 1
      ) {
        return 'Only a single non-collapsed dimension is allowed for group_breakdown_by';
      }
      return validateGroupings({ metrics, group_by });
    },
  }
);

const mosaicStateSchemaESQL = schema.object(
  {
    type: schema.literal('mosaic'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetEsqlTableSchema,
    ...mosaicStateSharedSchema,
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
        maxSize: 1,
        meta: { description: 'Array of metric configurations (only 1 allowed)' },
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
          meta: { description: 'Array of breakdown dimensions (minimum 1)' },
        }
      )
    ),

    group_breakdown_by: schema.maybe(
      schema.arrayOf(
        schema.allOf([partitionStateBreakdownByOptionsSchema, esqlColumnSchema], {
          meta: {
            description:
              'Group breakdown dimension configuration for ES|QL mode, combining breakdown options with column selection',
          },
        }),
        {
          minSize: 1,
          maxSize: 100,
          meta: { description: 'Array of group breakdown dimensions (minimum 1)' },
        }
      )
    ),
  },
  {
    meta: {
      description:
        'Mosaic chart configuration schema for ES|QL queries, defining metrics and breakdown dimensions using column-based configuration',
    },
    validate: ({
      metrics,
      group_by,
      group_breakdown_by,
    }: {
      metrics: Array<PartitionMetric>;
      group_by?: Array<{ collapse_by?: string }>;
      group_breakdown_by?: Array<{ collapse_by?: string }>;
    }) => {
      if (group_by && group_by?.filter((def) => def.collapse_by != null).length > 1) {
        return 'Only a single non-collapsed dimension is allowed for group_by';
      }
      if (
        group_breakdown_by &&
        group_breakdown_by?.filter((def) => def.collapse_by != null).length > 1
      ) {
        return 'Only a single non-collapsed dimension is allowed for group_breakdown_by';
      }
      return validateGroupings({ metrics, group_by });
    },
  }
);

export const mosaicStateSchema = schema.oneOf([mosaicStateSchemaNoESQL, mosaicStateSchemaESQL], {
  meta: {
    description:
      'Mosaic chart configuration schema supporting both data source queries (non-ES|QL) and ES|QL query modes',
  },
});

export type MosaicState = TypeOf<typeof mosaicStateSchema>;
export type MosaicStateNoESQL = TypeOf<typeof mosaicStateSchemaNoESQL>;
export type MosaicStateESQL = TypeOf<typeof mosaicStateSchemaESQL>;
