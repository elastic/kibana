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
  legendTruncateAfterLinesSchema,
  legendVisibleSchema,
  legendSizeSchema,
  valueDisplaySchema,
} from './partition_shared';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
} from './shared';

/**
 * Shared visualization options for partition charts including legend and value display
 */
export const waffleStateSharedSchema = {
  legend: schema.maybe(
    schema.object(
      {
        values: schema.maybe(
          schema.arrayOf(
            schema.oneOf([schema.literal('absolute')], {
              meta: {
                description:
                  'Legend value display mode: absolute (show raw metric values in legend)',
              },
            }),
            { minSize: 1, maxSize: 1 }
          )
        ),
        truncate_after_lines: legendTruncateAfterLinesSchema,
        visible: legendVisibleSchema,
        size: legendSizeSchema,
      },
      { meta: { description: 'Legend configuration for waffle chart' } }
    )
  ),
  value_display: valueDisplaySchema,
};

/**
 * Color configuration for primary metric in waffle chart
 */
const partitionStatePrimaryMetricOptionsSchema = schema.object({
  color: schema.maybe(staticColorSchema),
});

/**
 * Breakdown configuration including color mapping and collapse behavior
 */
const partitionStateBreakdownByOptionsSchema = schema.object({
  color: schema.maybe(
    schema.oneOf([colorByValueSchema, colorMappingSchema], {
      meta: {
        description: 'Color configuration: by value (palette-based) or mapping (custom rules)',
      },
    })
  ),
  collapse_by: schema.maybe(collapseBySchema),
});

function validateGroupings({
  metrics,
  group_by,
}: {
  metrics: Array<{}>;
  group_by?: Array<{ collapse_by?: string }>;
}) {
  if (metrics.length > 1) {
    if ((group_by?.filter((def) => def.collapse_by == null).length ?? 0) > 0) {
      return 'When multiple metrics are defined, only collapsed breakdown dimensions are allowed.';
    }
  }
  if ((group_by?.filter((def) => def.collapse_by == null).length ?? 0) > 1) {
    return 'Only a single non-collapsed breakdown dimension is allowed.';
  }
}

/**
 * Waffle chart configuration for standard (non-ES|QL) queries
 */
export const waffleStateSchemaNoESQL = schema.object(
  {
    type: schema.literal('waffle'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetSchema,
    ...waffleStateSharedSchema,
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
    meta: { description: 'Waffle chart configuration for standard queries' },
    validate: validateGroupings,
  }
);

/**
 * Waffle chart configuration for ES|QL queries
 */
const waffleStateSchemaESQL = schema.object(
  {
    type: schema.literal('waffle'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetEsqlTableSchema,
    ...waffleStateSharedSchema,
    metrics: schema.arrayOf(
      schema.allOf(
        [
          schema.object(genericOperationOptionsSchema),
          partitionStatePrimaryMetricOptionsSchema,
          esqlColumnSchema,
        ],
        { meta: { description: 'ES|QL column reference for primary metric' } }
      ),
      { maxSize: 100 }
    ),
    group_by: schema.maybe(
      schema.arrayOf(
        schema.allOf([partitionStateBreakdownByOptionsSchema, esqlColumnSchema], {
          meta: { description: 'ES|QL column reference for breakdown dimension' },
        }),
        {
          minSize: 1,
          maxSize: 100,
          meta: { description: 'Array of ES|QL breakdown columns (minimum 1)' },
        }
      )
    ),
  },
  {
    meta: { description: 'Waffle chart configuration for ES|QL queries' },
    validate: validateGroupings,
  }
);

/**
 * Complete waffle chart configuration supporting both standard and ES|QL queries
 */
export const waffleStateSchema = schema.oneOf([waffleStateSchemaNoESQL, waffleStateSchemaESQL], {
  meta: { description: 'Waffle chart configuration: DSL or ES|QL query based' },
});

export type WaffleState = TypeOf<typeof waffleStateSchema>;
export type WaffleStateNoESQL = TypeOf<typeof waffleStateSchemaNoESQL>;
export type WaffleStateESQL = TypeOf<typeof waffleStateSchemaESQL>;
