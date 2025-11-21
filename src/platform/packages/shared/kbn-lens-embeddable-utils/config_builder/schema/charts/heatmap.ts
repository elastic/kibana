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
import { sharedPanelInfoSchema, layerSettingsSchema, dslOnlyPanelInfoSchema } from '../shared';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchema,
} from './shared';
import { positionSchema } from '../alignments';

export const titleSchemaProps = {
  value: schema.maybe(schema.string({ defaultValue: '' })),
  visible: schema.maybe(schema.boolean()),
};

const legendSchemaProps = {
  truncate_after_lines: schema.maybe(schema.number()),
  visible: schema.maybe(schema.boolean()),
  size: schema.maybe(
    schema.oneOf(
      [
        schema.literal('auto'),
        schema.literal('small'),
        schema.literal('medium'),
        schema.literal('large'),
        schema.literal('xlarge'),
      ],
      { defaultValue: 'auto' }
    )
  ),
  position: schema.maybe(positionSchema()),
};

const labelsSchemaProps = {
  visible: schema.maybe(schema.boolean({ defaultValue: true })),
  orientation: schema.maybe(
    schema.oneOf(
      [schema.literal('horizontal'), schema.literal('vertical'), schema.literal('angled')],
      { defaultValue: 'horizontal' }
    )
  ),
};

const simpleLabelsSchema = schema.object(omit(labelsSchemaProps, 'orientation'));

const heatmapSharedStateSchema = {
  type: schema.literal('heatmap'),
  legend: schema.maybe(schema.object(legendSchemaProps)),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  axes: schema.maybe(
    schema.object({
      x: schema.maybe(
        schema.object({
          title: schema.maybe(schema.object(titleSchemaProps)),
          labels: schema.maybe(schema.object(labelsSchemaProps)),
        })
      ),
      y: schema.maybe(
        schema.object({
          title: schema.maybe(schema.object(titleSchemaProps)),
          labels: schema.maybe(simpleLabelsSchema),
        })
      ),
    })
  ),
  cells: schema.maybe(
    schema.object({
      labels: schema.maybe(simpleLabelsSchema),
    })
  ),
};

const heatmapAxesStateSchema = {
  xAxis: mergeAllBucketsWithChartDimensionSchema(schema.object({})),
  yAxis: schema.maybe(mergeAllBucketsWithChartDimensionSchema(schema.object({}))),
};

const heatmapAxesStateESQLSchema = {
  xAxis: esqlColumnSchema,
  yAxis: schema.maybe(esqlColumnSchema),
};

const heatmapStateMetricOptionsSchema = {
  color: schema.maybe(colorByValueSchema),
};

export const heatmapStateSchemaNoESQL = schema.object({
  ...heatmapSharedStateSchema,
  ...heatmapAxesStateSchema,
  ...dslOnlyPanelInfoSchema,
  ...datasetSchema,
  metric: mergeAllMetricsWithChartDimensionSchema(
    schema.object({
      ...heatmapStateMetricOptionsSchema,
    })
  ),
});

export const heatmapStateSchemaESQL = schema.object({
  ...heatmapSharedStateSchema,
  ...heatmapAxesStateESQLSchema,
  ...datasetEsqlTableSchema,
  metric: schema.allOf([
    schema.object({
      ...heatmapStateMetricOptionsSchema,
    }),
    esqlColumnSchema,
  ]),
});

export const heatmapStateSchema = schema.oneOf([heatmapStateSchemaNoESQL, heatmapStateSchemaESQL]);

export type HeatmapState = TypeOf<typeof heatmapStateSchema>;
export type HeatmapStateNoESQL = TypeOf<typeof heatmapStateSchemaNoESQL>;
export type HeatmapStateESQL = TypeOf<typeof heatmapStateSchemaESQL>;
