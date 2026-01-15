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
import { colorMappingSchema, staticColorSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import {
  collapseBySchema,
  dslOnlyPanelInfoSchema,
  layerSettingsSchema,
  sharedPanelInfoSchema,
} from '../shared';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
} from './shared';
import {
  legendNestedSchema,
  legendSizeSchema,
  legendTruncateAfterLinesSchema,
  legendVisibleSchema,
  validateMultipleMetricsCriteria,
  valueDisplaySchema,
} from './partition_shared';

/**
 * Shared visualization options for pie/donut charts including legend, value display, and label positioning
 */
const pieStateSharedSchema = {
  legend: schema.maybe(
    schema.object(
      {
        nested: legendNestedSchema,
        truncate_after_lines: legendTruncateAfterLinesSchema,
        visible: legendVisibleSchema,
        size: legendSizeSchema,
      },
      { meta: { description: 'Legend configuration for pie/donut chart' } }
    )
  ),
  value_display: valueDisplaySchema,
  label_position: schema.maybe(
    schema.oneOf([schema.literal('hidden'), schema.literal('inside'), schema.literal('outside')], {
      meta: { description: 'Position of slice labels: hidden, inside, or outside' },
    })
  ),
  donut_hole: schema.maybe(
    schema.oneOf(
      [
        schema.literal('none'),
        schema.literal('small'),
        schema.literal('medium'),
        schema.literal('large'),
      ],
      { meta: { description: 'Donut hole size: none (pie), small, medium, or large' } }
    )
  ),
};

/**
 * Color configuration for primary metric in pie/donut chart
 */
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
        'Configuration options for primary metric values in a pie/donut partition, including static color settings',
    },
  }
);

/**
 * Breakdown configuration including color mapping and collapse behavior
 */
const partitionStateBreakdownByOptionsSchema = schema.object(
  {
    color: schema.maybe(colorMappingSchema),
    collapse_by: schema.maybe(collapseBySchema),
  },
  { meta: { description: 'Breakdown dimension options with color and collapse configuration' } }
);

/**
 * Pie/donut chart type
 */
const pieTypeSchema = schema.oneOf([schema.literal('pie'), schema.literal('donut')], {
  meta: { description: 'Chart type: pie or donut' },
});

/**
 * Pie/donut chart configuration for standard (non-ES|QL) queries
 */
export const pieStateSchemaNoESQL = schema.object(
  {
    type: pieTypeSchema,
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetSchema,
    ...pieStateSharedSchema,
    ...dslOnlyPanelInfoSchema,
    metrics: schema.arrayOf(
      mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
        partitionStatePrimaryMetricOptionsSchema
      ),
      {
        minSize: 1,
        maxSize: 100,
        meta: { description: 'Array of metric configurations (minimum 1)' },
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
  },
  {
    meta: { description: 'Pie/donut chart configuration for standard queries' },
    validate: validateMultipleMetricsCriteria,
  }
);

/**
 * Pie/donut chart configuration for ES|QL queries
 */
const pieStateSchemaESQL = schema.object(
  {
    type: pieTypeSchema,
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetEsqlTableSchema,
    ...pieStateSharedSchema,
    metrics: schema.arrayOf(
      schema.allOf(
        [
          schema.object(genericOperationOptionsSchema),
          partitionStatePrimaryMetricOptionsSchema,
          esqlColumnSchema,
        ],
        { meta: { description: 'ES|QL column reference for primary metric' } }
      ),
      {
        minSize: 1,
        maxSize: 100,
        meta: { description: 'Array of metric configurations (minimum 1)' },
      }
    ),
    group_by: schema.maybe(
      schema.arrayOf(
        schema.allOf([partitionStateBreakdownByOptionsSchema, esqlColumnSchema], {
          meta: { description: 'ES|QL column reference for breakdown dimension' },
        }),
        {
          minSize: 1,
          maxSize: 100,
          meta: { description: 'Array of breakdown dimensions (minimum 1)' },
        }
      )
    ),
  },
  {
    meta: { description: 'Pie/donut chart configuration for ES|QL queries' },
    validate: validateMultipleMetricsCriteria,
  }
);

/**
 * Complete pie/donut chart configuration supporting both standard and ES|QL queries
 */
export const pieStateSchema = schema.oneOf([pieStateSchemaNoESQL, pieStateSchemaESQL], {
  meta: { description: 'Pie/donut chart state: standard query or ES|QL query' },
});

export type PieState = TypeOf<typeof pieStateSchema>;
export type PieStateNoESQL = TypeOf<typeof pieStateSchemaNoESQL>;
export type PieStateESQL = TypeOf<typeof pieStateSchemaESQL>;
