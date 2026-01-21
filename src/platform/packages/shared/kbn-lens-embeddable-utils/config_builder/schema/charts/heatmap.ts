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

import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import { colorByValueSchema } from '../color';
import { esqlColumnSchema } from '../metric_ops';
import {
  sharedPanelInfoSchema,
  layerSettingsSchema,
  dslOnlyPanelInfoSchema,
  axisTitleSchemaProps,
} from '../shared';
import { mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps } from './shared';
import { positionSchema } from '../alignments';
import { builderEnums } from '../enums';
import { bucketOperationDefinitionSchema } from '../bucket_ops';

const legendSchemaProps = {
  truncate_after_lines: schema.maybe(
    schema.number({ meta: { description: 'Number of lines before truncating legend text' } })
  ),
  visible: schema.maybe(schema.boolean({ meta: { description: 'Whether to show the legend' } })),
  size: schema.maybe(
    schema.oneOf(
      [
        schema.literal('auto'),
        schema.literal('small'),
        schema.literal('medium'),
        schema.literal('large'),
        schema.literal('xlarge'),
      ],
      { defaultValue: 'auto', meta: { description: 'Size of the legend' } }
    )
  ),
  position: schema.maybe(positionSchema({ meta: { description: 'Legend position' } })),
};

const labelsSchemaProps = {
  visible: schema.maybe(
    schema.boolean({ defaultValue: true, meta: { description: 'Whether to show axis labels' } })
  ),
  orientation: schema.maybe(
    builderEnums.orientation({
      defaultValue: 'horizontal',
      meta: { description: 'Orientation of the axis labels' },
    })
  ),
};

const simpleLabelsSchema = schema.object(omit(labelsSchemaProps, 'orientation'));

const heatmapSharedStateSchema = {
  type: schema.literal('heatmap'),
  legend: schema.maybe(
    schema.object(legendSchemaProps, { meta: { description: 'Legend configuration' } })
  ),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  axes: schema.maybe(
    schema.object(
      {
        x: schema.maybe(
          schema.object({
            title: schema.maybe(schema.object(axisTitleSchemaProps)),
            labels: schema.maybe(schema.object(labelsSchemaProps)),
          })
        ),
        y: schema.maybe(
          schema.object({
            title: schema.maybe(schema.object(axisTitleSchemaProps)),
            labels: schema.maybe(simpleLabelsSchema),
          })
        ),
      },
      { meta: { description: 'Axis configuration for X and Y axes' } }
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
                meta: { description: 'Whether to show cell labels' },
              })
            ),
          })
        ),
      },
      { meta: { description: 'Cells configuration' } }
    )
  ),
};

const heatmapAxesStateSchemaProps = {
  xAxis: bucketOperationDefinitionSchema,
  yAxis: schema.maybe(bucketOperationDefinitionSchema),
};

const heatmapAxesStateESQLSchemaProps = {
  xAxis: esqlColumnSchema,
  yAxis: schema.maybe(esqlColumnSchema),
};

const heatmapStateMetricOptionsSchemaProps = {
  color: schema.maybe(colorByValueSchema),
};

export const heatmapStateSchemaNoESQL = schema.object({
  ...heatmapSharedStateSchema,
  ...heatmapAxesStateSchemaProps,
  ...dslOnlyPanelInfoSchema,
  ...datasetSchema,
  metric: mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
    schema.object(heatmapStateMetricOptionsSchemaProps)
  ),
});

export const heatmapStateSchemaESQL = schema.object({
  ...heatmapSharedStateSchema,
  ...heatmapAxesStateESQLSchemaProps,
  ...datasetEsqlTableSchema,
  metric: schema.allOf([schema.object(heatmapStateMetricOptionsSchemaProps), esqlColumnSchema]),
});

export const heatmapStateSchema = schema.oneOf([heatmapStateSchemaNoESQL, heatmapStateSchemaESQL]);

export type HeatmapState = TypeOf<typeof heatmapStateSchema>;
export type HeatmapStateNoESQL = TypeOf<typeof heatmapStateSchemaNoESQL>;
export type HeatmapStateESQL = TypeOf<typeof heatmapStateSchemaESQL>;
