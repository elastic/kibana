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
  legendTruncateAfterLinesSchema,
  sharedPanelInfoSchema,
} from '../shared';
import {
  legendSizeSchema,
  legendVisibilitySchemaWithAuto,
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
} from './shared';
import type { PartitionMetric } from './partition_shared';
import {
  legendNestedSchema,
  validateColoringAssignments,
  valueDisplaySchema,
} from './partition_shared';
import { objectUnion } from './utils/object_union';
import { groupIsNotCollapsed } from '../../utils';

const pieStateSharedSchema = {
  legend: schema.maybe(
    schema.object(
      {
        nested: legendNestedSchema,
        truncate_after_lines: legendTruncateAfterLinesSchema,
        visibility: legendVisibilitySchemaWithAuto,
        size: legendSizeSchema,
      },
      {
        meta: {
          id: 'pieLegend',
          title: 'Legend',
          description: 'Legend configuration for pie chart',
        },
      }
    )
  ),
};

/**
 * Pie chart styling: value display, slice labels, and donut hole
 */
const pieStylingSchema = schema.object(
  {
    values: valueDisplaySchema,
    labels: schema.maybe(
      schema.object(
        {
          visible: schema.maybe(schema.boolean({ meta: { description: 'Show slice labels' } })),
          position: schema.maybe(
            schema.oneOf([schema.literal('inside'), schema.literal('outside')], {
              meta: {
                description: 'Renders pie chart slice labels inside or outside the pie',
              },
            })
          ),
        },
        {
          meta: {
            description: 'Label configuration for pie chart slice labels inside or outside the pie',
          },
        }
      )
    ),
    donut_hole: schema.maybe(
      schema.oneOf(
        [schema.literal('none'), schema.literal('s'), schema.literal('m'), schema.literal('l')],
        { meta: { description: 'Donut hole size: none (pie), or s/m/l' } }
      )
    ),
  },
  {
    meta: {
      id: 'pieStyling',
      title: 'Pie chart styling',
      description: 'Visual chart styling options',
    },
  }
);

/**
 * Color configuration for primary metric in pie chart
 */
const partitionConfigPrimaryMetricOptionsSchema = {
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

const pieTypeSchema = schema.literal('pie');

function validateForMultipleMetrics({
  metrics,
  group_by,
}: {
  metrics: Array<PartitionMetric>;
  group_by?: Array<{ collapse_by?: string }>;
}) {
  const groupByDimensionNumber = (group_by && group_by.filter(groupIsNotCollapsed).length) || 0;
  if (metrics.length === 1) {
    if (groupByDimensionNumber > 3) {
      return 'The number of non-collapsed group_by dimensions must not exceed 3';
    }
  } else {
    if (groupByDimensionNumber > 2) {
      return 'When multiple metrics are defined, the number of non-collapsed group_by dimensions must not exceed 2';
    }
  }
  return validateColoringAssignments({ metrics, group_by });
}

/**
 * Pie chart configuration for standard (non-ES|QL) queries
 */
export const pieConfigSchemaNoESQL = schema.object(
  {
    type: pieTypeSchema,
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceSchema,
    ...dslOnlyPanelInfoSchema,
    ...pieStateSharedSchema,
    styling: schema.maybe(pieStylingSchema),
    metrics: schema.arrayOf(
      mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
        partitionConfigPrimaryMetricOptionsSchema,
        'pieMetric'
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
          'pieGroupBy'
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
      id: 'pieNoESQL',
      title: 'Pie Chart (DSL)',
      description: 'Pie chart configuration for standard queries',
    },
    validate: validateForMultipleMetrics,
  }
);

/**
 * Pie chart configuration for ES|QL queries
 */
export const pieConfigSchemaESQL = schema.object(
  {
    type: pieTypeSchema,
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceEsqlTableSchema,
    ...pieStateSharedSchema,
    styling: schema.maybe(pieStylingSchema),
    metrics: schema.arrayOf(
      esqlColumnWithFormatSchema.extends(partitionConfigPrimaryMetricOptionsSchema, {
        meta: { description: 'ES|QL column reference for primary metric' },
      }),
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
        meta: { description: 'Array of breakdown dimensions (minimum 1)' },
      })
    ),
  },
  {
    meta: {
      id: 'pieESQL',
      title: 'Pie Chart (ES|QL)',
      description: 'Pie chart configuration for ES|QL queries',
    },
    validate: validateForMultipleMetrics,
  }
);

/**
 * Complete pie chart configuration supporting both standard and ES|QL queries
 */
export const pieConfigSchema = objectUnion([pieConfigSchemaNoESQL, pieConfigSchemaESQL], {
  meta: {
    id: 'pieChart',
    title: 'Pie Chart',
    description: 'Pie chart state: standard query or ES|QL query',
  },
});

export type PieConfig = TypeOf<typeof pieConfigSchema>;
export type PieConfigNoESQL = TypeOf<typeof pieConfigSchemaNoESQL>;
export type PieConfigESQL = TypeOf<typeof pieConfigSchemaESQL>;
