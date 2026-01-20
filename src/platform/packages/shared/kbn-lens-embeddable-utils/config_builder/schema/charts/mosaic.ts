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
  legendTruncateAfterLinesSchema,
  legendVisibleSchema,
  legendSizeSchema,
  valueDisplaySchema,
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
        'Configuration options for primary metric values in a mosaic partition, including static color settings',
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
          description: 'Color configuration: by value (palette-based) or mapping (custom rules)',
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
        'Configuration options for breakdown dimensions in a mosaic partition, including color settings and collapse behavior',
    },
  }
);

function validateMosaicGroupings(obj: {
  outer_grouping: Array<{ collapse_by?: string }>;
  inner_grouping?: Array<{ collapse_by?: string }>;
}) {
  if (obj.outer_grouping.filter((def) => def.collapse_by == null).length > 1) {
    return 'In outer grouping, only a single non-collapsed dimension is allowed when using multiple dimensions.';
  }
  if ((obj.inner_grouping?.filter((def) => def.collapse_by == null).length ?? 0) > 1) {
    return 'In inner grouping, only a single non-collapsed dimension is allowed when using multiple dimensions.';
  }
}

export const mosaicStateSchemaNoESQL = schema.object(
  {
    type: schema.literal('mosaic'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetSchema,
    ...mosaicStateSharedSchema,
    /**
     * Primary value configuration, must define operation. Supports field-based operations (count, unique count, metrics, sum, last value, percentile, percentile ranks), reference-based operations (differences, moving average, cumulative sum, counter rate), and formula-like operations (static value, formula).
     */
    metric: mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
      partitionStatePrimaryMetricOptionsSchema
    ),
    outer_grouping: schema.arrayOf(
      mergeAllBucketsWithChartDimensionSchema(partitionStateBreakdownByOptionsSchema),
      {
        minSize: 1,
        maxSize: 100,
        meta: {
          description:
            'Array of vertical grouping dimensions: it can contains multiple collapsed by dimensions, but only a single non-collapsed one',
        },
      }
    ),
    inner_grouping: schema.maybe(
      schema.arrayOf(
        mergeAllBucketsWithChartDimensionSchema(partitionStateBreakdownByOptionsSchema),
        {
          minSize: 1,
          maxSize: 100,
          meta: {
            description:
              'Array of horizontal breakdown dimensions: it can contains multiple collapsed by dimensions, but only a single non-collapsed one',
          },
        }
      )
    ),
  },
  {
    meta: {
      description:
        'Mosaic chart configuration schema for data source queries (non-ES|QL mode), defining metrics and breakdown dimensions',
    },
    validate: validateMosaicGroupings,
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
    metric: schema.allOf(
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
    outer_grouping: schema.arrayOf(
      schema.allOf([partitionStateBreakdownByOptionsSchema, esqlColumnSchema]),
      {
        minSize: 1,
        maxSize: 100,
        meta: {
          description:
            'Array of vertical grouping dimensions: it can contains multiple collapsed by dimensions, but only a single non-collapsed one',
        },
      }
    ),
    inner_grouping: schema.maybe(
      schema.arrayOf(schema.allOf([partitionStateBreakdownByOptionsSchema, esqlColumnSchema]), {
        minSize: 1,
        maxSize: 100,
        meta: {
          description:
            'Array of vertical grouping dimensions: it can contains multiple collapsed by dimensions, but only a single non-collapsed one',
        },
      })
    ),
  },
  {
    meta: {
      description:
        'Mosaic chart configuration schema for ES|QL queries, defining metrics and breakdown dimensions using column-based configuration',
    },
    validate: validateMosaicGroupings,
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
