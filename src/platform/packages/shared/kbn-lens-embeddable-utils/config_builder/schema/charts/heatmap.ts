/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';

import { dataSourceSchema, dataSourceEsqlTableSchema } from '../data_source';
import { colorByValueSchema, autoColorSchema, AUTO_COLOR } from '../color';
import { esqlColumnWithFormatSchema } from '../metric_ops';
import {
  sharedPanelInfoSchema,
  layerSettingsSchema,
  dslOnlyPanelInfoSchema,
  axisTitleSchema,
  legendTruncateAfterLinesSchema,
} from '../shared';
import {
  baseLegendVisibilitySchema,
  legendSizeSchema,
  getMetricsWithChartDimensionSchemaWithRefBasedOps,
  xScaleSchema,
} from './shared';
import { orientationSchema } from '../enums';
import { bucketOperationDefinitionSchema } from '../bucket_ops';
import { positionSchema } from '../alignments';

const legendSchema = lazySchema(() =>
  z
    .object({
      truncate_after_lines: legendTruncateAfterLinesSchema,
      visibility: baseLegendVisibilitySchema,
      position: positionSchema.optional(),
      size: legendSizeSchema,
    })
    .strict()
);

const labelsSchema = lazySchema(() =>
  z
    .object({
      visible: z.boolean().default(true).optional().meta({ description: 'Show axis labels' }),
      orientation: orientationSchema.default('horizontal').optional().meta({
        description: 'Orientation of the axis labels',
      }),
    })
    .strict()
);

const simpleLabelsSchema = lazySchema(() => labelsSchema.omit({ orientation: true }));

const heatmapSortPredicateSchema = lazySchema(() =>
  z
    .union([z.literal('asc'), z.literal('desc')])
    .meta({ description: 'Axis sort order; omit or use undefined for no sorting' })
);

const visHeatmapCellsSchema = lazySchema(() =>
  z
    .object({
      labels: z
        .object({
          visible: z.boolean().default(false).optional().meta({ description: 'Show cell labels' }),
        })
        .strict()
        .optional(),
    })
    .strict()
    .optional()
    .meta({ id: 'visHeatmapCells', title: 'Cells', description: 'Cells configuration' })
);

const heatmapStylingSchema = lazySchema(() =>
  z
    .object({
      cells: visHeatmapCellsSchema,
    })
    .strict()
    .meta({
      id: 'visHeatmapStyling',
      title: 'Heatmap styling',
      description: 'Visual chart styling options',
    })
);

const visHeatmapLegendSchema = lazySchema(() =>
  legendSchema.optional().meta({
    id: 'visHeatmapLegend',
    title: 'Legend',
    description: 'Legend configuration',
  })
);

const visHeatmapXAxisSchema = lazySchema(() =>
  z
    .object({
      title: axisTitleSchema.optional(),
      labels: labelsSchema.optional(),
      sort: heatmapSortPredicateSchema.optional(),
      scale: xScaleSchema,
    })
    .strict()
    .optional()
    .meta({
      id: 'visHeatmapXAxis',
      title: 'X Axis',
      description: 'X axis configuration',
    })
);

const visHeatmapYAxisSchema = lazySchema(() =>
  z
    .object({
      title: axisTitleSchema.optional(),
      labels: simpleLabelsSchema.optional(),
      sort: heatmapSortPredicateSchema.optional(),
    })
    .strict()
    .optional()
    .meta({
      id: 'visHeatmapYAxis',
      title: 'Y Axis',
      description: 'Y axis configuration',
    })
);

const visHeatmapAxesSchema = lazySchema(() =>
  z
    .object({
      x: visHeatmapXAxisSchema,
      y: visHeatmapYAxisSchema,
    })
    .strict()
    .optional()
    .meta({
      id: 'visHeatmapAxes',
      title: 'Axes',
      description: 'Axis configuration for X and Y axes',
    })
);

const heatmapSharedConfigSchema = lazySchema(() =>
  z.object({
    type: z.literal('heatmap'),
    legend: visHeatmapLegendSchema,
    ...sharedPanelInfoSchema.shape,
    ...layerSettingsSchema.shape,
    axis: visHeatmapAxesSchema,
  })
);

const heatmapAxesConfigShape = {
  x: bucketOperationDefinitionSchema,
  y: bucketOperationDefinitionSchema.optional(),
};

const heatmapAxesConfigESQLShape = {
  x: esqlColumnWithFormatSchema,
  y: esqlColumnWithFormatSchema.optional(),
};

const heatmapConfigMetricOptionsShape = {
  color: z
    .union([colorByValueSchema, autoColorSchema])
    .default(AUTO_COLOR)
    .optional()
    .meta({ description: 'Color scale configuration for the heatmap cells.' }),
};

export const heatmapConfigSchemaNoESQL = lazySchema(() =>
  heatmapSharedConfigSchema
    .extend({
      ...heatmapAxesConfigShape,
      ...dslOnlyPanelInfoSchema.shape,
      ...dataSourceSchema.shape,
      styling: heatmapStylingSchema.optional(),
      metric: getMetricsWithChartDimensionSchemaWithRefBasedOps('heatmapMetric').and(
        z.object(heatmapConfigMetricOptionsShape)
      ),
    })
    .meta({
      id: 'visHeatmapNoESQL',
      title: 'Heatmap Chart (DSL)',
      description: 'Heatmap configuration using a data view.',
    })
);

export const heatmapConfigSchemaESQL = lazySchema(() =>
  heatmapSharedConfigSchema
    .extend({
      ...heatmapAxesConfigESQLShape,
      ...dataSourceEsqlTableSchema.shape,
      styling: heatmapStylingSchema.optional(),
      metric: esqlColumnWithFormatSchema.extend(heatmapConfigMetricOptionsShape),
    })
    .meta({
      id: 'visHeatmapESQL',
      title: 'Heatmap Chart (ES|QL)',
      description: 'Heatmap configuration using an ES|QL query.',
    })
);

export const heatmapConfigSchema = lazySchema(() =>
  z.union([heatmapConfigSchemaNoESQL, heatmapConfigSchemaESQL]).meta({
    id: 'visHeatmapChart',
    title: 'Heatmap Chart',
    description:
      'A grid of colored cells where color intensity represents the metric value at each X/Y intersection.',
  })
);

export type HeatmapConfig = z.output<typeof heatmapConfigSchema>;
export type HeatmapConfigInput = z.input<typeof heatmapConfigSchema>;
export type HeatmapConfigNoESQL = z.output<typeof heatmapConfigSchemaNoESQL>;
export type HeatmapConfigESQL = z.output<typeof heatmapConfigSchemaESQL>;
