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
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
} from './shared';
import {
  legendNestedSchema,
  legendSizeSchema,
  legendTruncateAfterLinesSchema,
  legendVisibleSchema,
  valueDisplaySchema,
} from './partition_shared';

const pieStateSharedSchema = {
  legend: schema.maybe(
    schema.object({
      nested: legendNestedSchema,
      truncate_after_lines: legendTruncateAfterLinesSchema,
      visible: legendVisibleSchema,
      size: legendSizeSchema,
    })
  ),
  value_display: valueDisplaySchema,
  /**
   * Position of the labels
   */
  label_position: schema.maybe(
    schema.oneOf([schema.literal('hidden'), schema.literal('inside'), schema.literal('outside')])
  ),
  /**
   * Size of the donut hole
   */
  donut_hole: schema.maybe(
    schema.oneOf([
      schema.literal('none'),
      schema.literal('small'),
      schema.literal('medium'),
      schema.literal('large'),
    ])
  ),
};

const partitionStatePrimaryMetricOptionsSchema = schema.object({
  /**
   * Color configuration
   */
  color: schema.maybe(staticColorSchema),
});

const partitionStateBreakdownByOptionsSchema = schema.object({
  /**
   * Color configuration
   */
  color: schema.maybe(schema.oneOf([colorByValueSchema, colorMappingSchema])),
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
});

const pieTypeSchema = schema.oneOf([schema.literal('pie'), schema.literal('donut')]);

export const pieStateSchemaNoESQL = schema.object({
  type: pieTypeSchema,
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetSchema,
  ...pieStateSharedSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metrics: schema.arrayOf(
    mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
      partitionStatePrimaryMetricOptionsSchema
    ),
    { minSize: 1 }
  ),
  /**
   * Configure how to break down the metric (e.g. show one metric per term).
   */
  group_by: schema.arrayOf(
    schema.maybe(mergeAllBucketsWithChartDimensionSchema(partitionStateBreakdownByOptionsSchema)),
    { minSize: 1 }
  ),
});

const pieStateSchemaESQL = schema.object({
  type: pieTypeSchema,
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  ...pieStateSharedSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metrics: schema.allOf([
    schema.object(genericOperationOptionsSchema),
    partitionStatePrimaryMetricOptionsSchema,
    esqlColumnSchema,
  ]),
  /**
   * Configure how to break down the metric (e.g. show one metric per term).
   */
  group_by: schema.maybe(schema.allOf([partitionStateBreakdownByOptionsSchema, esqlColumnSchema])),
});

export const pieStateSchema = schema.oneOf([pieStateSchemaNoESQL, pieStateSchemaESQL]);

export type PieState = TypeOf<typeof pieStateSchema>;
export type PieStateNoESQL = TypeOf<typeof pieStateSchemaNoESQL>;
export type PieStateESQL = TypeOf<typeof pieStateSchemaESQL>;
