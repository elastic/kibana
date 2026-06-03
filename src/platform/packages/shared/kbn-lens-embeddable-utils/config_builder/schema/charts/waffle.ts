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
import { esqlColumnWithFormatSchema } from '../metric_ops';
import { colorMappingSchema, staticColorSchema, autoColorSchema, AUTO_COLOR } from '../color';
import { dataSourceSchema, dataSourceEsqlTableSchema } from '../data_source';
import {
  collapseBySchema,
  dslOnlyPanelInfoSchema,
  layerSettingsSchema,
  sharedPanelInfoSchema,
  legendTruncateAfterLinesSchema,
} from '../shared';
import { validateMultipleMetricsCriteria, valueDisplaySchema } from './partition_shared';
import {
  legendSizeSchema,
  legendVisibilitySchemaWithAuto,
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
} from './shared';
import { objectUnion } from './utils/object_union';

const waffleConfigSharedSchema = {
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
        visibility: legendVisibilitySchemaWithAuto,
        size: legendSizeSchema,
      },
      {
        meta: {
          id: 'waffleLegend',
          title: 'Legend',
          description: 'Legend configuration for waffle chart',
        },
      }
    )
  ),
};

const waffleStylingSchema = schema.object(
  {
    values: valueDisplaySchema,
  },
  {
    meta: {
      id: 'waffleStyling',
      title: 'Waffle styling',
      description: 'Visual chart styling options',
    },
  }
);

/**
 * Color configuration for primary metric in waffle chart
 */
const partitionConfigPrimaryMetricOptionsSchema = {
  /**
   * Color configuration
   */
  color: schema.maybe(
    schema.oneOf([staticColorSchema, autoColorSchema], {
      defaultValue: AUTO_COLOR,
    })
  ),
};

/**
 * Breakdown configuration including color mapping and collapse behavior
 */
const partitionConfigBreakdownByOptionsSchema = {
  color: schema.maybe(colorMappingSchema),
  collapse_by: schema.maybe(collapseBySchema),
};

/**
 * Waffle chart configuration for standard (non-ES|QL) queries
 */
export const waffleConfigSchemaNoESQL = schema.object(
  {
    type: schema.literal('waffle'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceSchema,
    ...dslOnlyPanelInfoSchema,
    ...waffleConfigSharedSchema,
    styling: schema.maybe(waffleStylingSchema),
    metrics: schema.arrayOf(
      mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
        partitionConfigPrimaryMetricOptionsSchema,
        'waffleMetric'
      ),
      {
        minSize: 1,
        maxSize: 100,
        meta: { description: 'Array of metric configurations (minimum 1)' },
      }
    ),
    group_by: schema.maybe(
      schema.arrayOf(
        mergeAllBucketsWithChartDimensionSchema(
          partitionConfigBreakdownByOptionsSchema,
          'waffleGroupBy'
        ),
        {
          minSize: 1,
          maxSize: 100,
          meta: { description: 'Array of breakdown dimensions (minimum 1)' },
        }
      )
    ),
  },
  {
    meta: {
      id: 'waffleNoESQL',
      title: 'Waffle Chart (DSL)',
      description: 'Waffle chart configuration for standard queries',
    },
    validate: validateMultipleMetricsCriteria,
  }
);

/**
 * Waffle chart configuration for ES|QL queries
 */
export const waffleConfigSchemaESQL = schema.object(
  {
    type: schema.literal('waffle'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceEsqlTableSchema,
    ...waffleConfigSharedSchema,
    styling: schema.maybe(waffleStylingSchema),
    metrics: schema.arrayOf(
      esqlColumnWithFormatSchema.extends(partitionConfigPrimaryMetricOptionsSchema),
      {
        minSize: 1,
        maxSize: 100,
        meta: { description: 'Array of metric configurations (minimum 1)' },
      }
    ),
    group_by: schema.maybe(
      schema.arrayOf(esqlColumnWithFormatSchema.extends(partitionConfigBreakdownByOptionsSchema), {
        minSize: 1,
        maxSize: 100,
        meta: { description: 'Array of ES|QL breakdown columns (minimum 1)' },
      })
    ),
  },
  {
    meta: {
      id: 'waffleESQL',
      title: 'Waffle Chart (ES|QL)',
      description: 'Waffle chart configuration for ES|QL queries',
    },
    validate: validateMultipleMetricsCriteria,
  }
);

/**
 * Complete waffle chart configuration supporting both standard and ES|QL queries
 */
export const waffleConfigSchema = objectUnion([waffleConfigSchemaNoESQL, waffleConfigSchemaESQL], {
  meta: {
    id: 'waffleChart',
    title: 'Waffle Chart',
    description: 'Waffle chart configuration: DSL or ES|QL query based',
  },
});

export type WaffleConfig = TypeOf<typeof waffleConfigSchema>;
export type WaffleConfigNoESQL = TypeOf<typeof waffleConfigSchemaNoESQL>;
export type WaffleConfigESQL = TypeOf<typeof waffleConfigSchemaESQL>;
