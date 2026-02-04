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
import { esqlColumnOperationWithLabelAndFormatSchema, esqlColumnSchema } from '../metric_ops';
import { colorMappingSchema, staticColorSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import {
  collapseBySchema,
  dslOnlyPanelInfoSchema,
  layerSettingsSchema,
  sharedPanelInfoSchema,
  legendTruncateAfterLinesSchema,
} from '../shared';
import {
  legendVisibleSchema,
  validateMultipleMetricsCriteria,
  valueDisplaySchema,
} from './partition_shared';
import {
  legendSizeSchema,
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
      { meta: { id: 'waffleLegend', description: 'Legend configuration for waffle chart' } }
    )
  ),
  value_display: valueDisplaySchema,
};

/**
 * Color configuration for primary metric in waffle chart
 */
const partitionStatePrimaryMetricOptionsSchema = {
  /**
   * Color configuration
   */
  color: schema.maybe(staticColorSchema),
};

/**
 * Breakdown configuration including color mapping and collapse behavior
 */
const partitionStateBreakdownByOptionsSchema = {
  color: schema.maybe(colorMappingSchema),
  collapse_by: schema.maybe(collapseBySchema),
};

/**
 * Waffle chart configuration for standard (non-ES|QL) queries
 */
export const waffleStateSchemaNoESQL = schema.object(
  {
    type: schema.literal('waffle'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetSchema,
    ...dslOnlyPanelInfoSchema,
    ...waffleStateSharedSchema,
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
    meta: { id: 'waffleNoESQL', description: 'Waffle chart configuration for standard queries' },
    validate: validateMultipleMetricsCriteria,
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
      esqlColumnOperationWithLabelAndFormatSchema.extends(partitionStatePrimaryMetricOptionsSchema),
      {
        minSize: 1,
        maxSize: 100,
        meta: { description: 'Array of metric configurations (minimum 1)' },
      }
    ),
    group_by: schema.maybe(
      schema.arrayOf(esqlColumnSchema.extends(partitionStateBreakdownByOptionsSchema), {
        minSize: 1,
        maxSize: 100,
        meta: { description: 'Array of ES|QL breakdown columns (minimum 1)' },
      })
    ),
  },
  {
    meta: { id: 'waffleESQL', description: 'Waffle chart configuration for ES|QL queries' },
    validate: validateMultipleMetricsCriteria,
  }
);

/**
 * Complete waffle chart configuration supporting both standard and ES|QL queries
 */
export const waffleStateSchema = schema.oneOf([waffleStateSchemaNoESQL, waffleStateSchemaESQL], {
  meta: {
    id: 'waffleChartSchema',
    description: 'Waffle chart configuration: DSL or ES|QL query based',
  },
});

export type WaffleState = TypeOf<typeof waffleStateSchema>;
export type WaffleStateNoESQL = TypeOf<typeof waffleStateSchemaNoESQL>;
export type WaffleStateESQL = TypeOf<typeof waffleStateSchemaESQL>;
