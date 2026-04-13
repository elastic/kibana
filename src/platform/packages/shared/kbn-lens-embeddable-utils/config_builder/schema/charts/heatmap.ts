/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';

import { schema, type TypeOf } from '@kbn/config-schema';

import { dataSourceSchema, dataSourceEsqlTableSchema } from '../data_source';
import { colorByValueSchema, autoColorSchema, AUTO_COLOR } from '../color';
import { esqlColumnWithFormatSchema } from '../metric_ops';
import {
  sharedPanelInfoSchema,
  layerSettingsSchema,
  dslOnlyPanelInfoSchema,
  axisTitleSchemaProps,
  legendTruncateAfterLinesSchema,
} from '../shared';
import {
  baseLegendVisibilitySchema,
  legendSizeSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
  xScaleSchema,
} from './shared';
import { builderEnums } from '../enums';
import { bucketOperationDefinitionSchema } from '../bucket_ops';
import { objectUnion } from './utils/object_union';

const legendSchemaProps = {
  truncate_after_lines: legendTruncateAfterLinesSchema,
  visibility: baseLegendVisibilitySchema,
  size: legendSizeSchema,
};

const labelsSchemaProps = {
  visible: schema.maybe(
    schema.boolean({ defaultValue: true, meta: { description: 'Show axis labels' } })
  ),
  orientation: schema.maybe(
    builderEnums.orientation({
      defaultValue: 'horizontal',
      meta: { description: 'Orientation of the axis labels' },
    })
  ),
};

const simpleLabelsSchema = schema.object(omit(labelsSchemaProps, 'orientation'));

const heatmapSortPredicateSchema = schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
  meta: { description: 'Axis sort order; omit or use undefined for no sorting' },
});

const heatmapSharedStateSchema = {
  type: schema.literal('heatmap'),
  legend: schema.maybe(
    schema.object(legendSchemaProps, {
      meta: {
        id: 'heatmapLegend',
        title: 'Legend',
        description: 'Legend configuration',
      },
    })
  ),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  axes: schema.maybe(
    schema.object(
      {
        x: schema.maybe(
          schema.object(
            {
              title: schema.maybe(schema.object(axisTitleSchemaProps)),
              labels: schema.maybe(schema.object(labelsSchemaProps)),
              sort: schema.maybe(heatmapSortPredicateSchema),
              scale: xScaleSchema,
            },
            {
              meta: {
                id: 'heatmapXAxis',
                title: 'X Axis',
                description: 'X axis configuration',
              },
            }
          )
        ),
        y: schema.maybe(
          schema.object(
            {
              title: schema.maybe(schema.object(axisTitleSchemaProps)),
              labels: schema.maybe(simpleLabelsSchema),
              sort: schema.maybe(heatmapSortPredicateSchema),
            },
            {
              meta: {
                id: 'heatmapYAxis',
                title: 'Y Axis',
                description: 'Y axis configuration',
              },
            }
          )
        ),
      },
      {
        meta: {
          id: 'heatmapAxes',
          title: 'Axes',
          description: 'Axis configuration for X and Y axes',
        },
      }
    )
  ),
  cells: schema.maybe(
    schema.object(
      {
        labels: schema.maybe(
          schema.object({
            visible: schema.maybe(
              schema.boolean({
                defaultValue: false,
                meta: { description: 'Show cell labels' },
              })
            ),
          })
        ),
      },
      { meta: { id: 'heatmapCells', title: 'Cells', description: 'Cells configuration' } }
    )
  ),
};

const heatmapAxesStateSchemaProps = {
  x: bucketOperationDefinitionSchema,
  y: schema.maybe(bucketOperationDefinitionSchema),
};

const heatmapAxesStateESQLSchemaProps = {
  x: esqlColumnWithFormatSchema,
  y: schema.maybe(esqlColumnWithFormatSchema),
};

const heatmapStateMetricOptionsSchemaProps = {
  color: schema.maybe(
    schema.oneOf([colorByValueSchema, autoColorSchema], {
      defaultValue: AUTO_COLOR,
    })
  ),
};

export const heatmapStateSchemaNoESQL = schema.object(
  {
    ...heatmapSharedStateSchema,
    ...heatmapAxesStateSchemaProps,
    ...dslOnlyPanelInfoSchema,
    ...dataSourceSchema,
    metric: mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
      heatmapStateMetricOptionsSchemaProps
    ),
  },
  { meta: { id: 'heatmapNoESQL', title: 'Heatmap Chart (DSL)' } }
);

export const heatmapStateSchemaESQL = schema.object(
  {
    ...heatmapSharedStateSchema,
    ...heatmapAxesStateESQLSchemaProps,
    ...dataSourceEsqlTableSchema,
    metric: esqlColumnWithFormatSchema.extends(heatmapStateMetricOptionsSchemaProps),
  },
  { meta: { id: 'heatmapESQL', title: 'Heatmap Chart (ES|QL)' } }
);

export const heatmapStateSchema = objectUnion([heatmapStateSchemaNoESQL, heatmapStateSchemaESQL], {
  meta: { id: 'heatmapChart', title: 'Heatmap Chart' },
});

export type HeatmapState = TypeOf<typeof heatmapStateSchema>;
export type HeatmapStateNoESQL = TypeOf<typeof heatmapStateSchemaNoESQL>;
export type HeatmapStateESQL = TypeOf<typeof heatmapStateSchemaESQL>;
