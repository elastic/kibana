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
import { colorMappingSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import { dslOnlyPanelInfoSchema, layerSettingsSchema, sharedPanelInfoSchema } from '../shared';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchema,
} from './shared';

const tagcloudStateMetricOptionsSchema = schema.object({
  /**
   * Whether to show the metric label
   */
  show_metric_label: schema.boolean({
    meta: { description: 'Show metric label' },
    defaultValue: false,
  }),
});

const tagcloudStateTagsByOptionsSchema = schema.object({
  /**
   * Color configuration
   */
  color: schema.maybe(colorMappingSchema),
});

const tagcloudStateSharedOptionsSchema = {
  /**
   * Orientation of the tagcloud:
   * - 'horizontal': Horizontal orientation (default)
   * - 'vertical': Vertical orientation
   * - 'right_angled': Right angled orientation
   **/
  orientation: schema.maybe(
    schema.oneOf(
      [schema.literal('horizontal'), schema.literal('vertical'), schema.literal('right_angled')],
      { defaultValue: 'horizontal' }
    )
  ),
  /**
   * Font size configuration:
   * - 'min': Minimum font size (default: 14)
   * - 'max': Maximum font size (default: 72)
   **/
  font_size: schema.maybe(
    schema.object({
      min: schema.number({ defaultValue: 14, min: 1 }),
      max: schema.number({ defaultValue: 72, max: 120 }),
    })
  ),
};

export const tagcloudStateSchemaNoESQL = schema.object({
  type: schema.literal('tagcloud'),
  ...sharedPanelInfoSchema,
  ...dslOnlyPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetSchema,
  ...tagcloudStateSharedOptionsSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metric: mergeAllMetricsWithChartDimensionSchema(tagcloudStateMetricOptionsSchema),
  /**
   * Configure how to break down to tags
   */
  tag_by: schema.maybe(mergeAllBucketsWithChartDimensionSchema(tagcloudStateTagsByOptionsSchema)),
});

const tagcloudStateSchemaESQL = schema.object({
  type: schema.literal('tagcloud'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  ...tagcloudStateSharedOptionsSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metric: schema.allOf([
    schema.object(genericOperationOptionsSchema),
    tagcloudStateMetricOptionsSchema,
    esqlColumnSchema,
  ]),
  /**
   * Configure how to break down the metric (e.g. show one metric per term).
   */
  tag_by: schema.maybe(schema.allOf([tagcloudStateTagsByOptionsSchema, esqlColumnSchema])),
});

export const tagcloudStateSchema = schema.oneOf([
  tagcloudStateSchemaNoESQL,
  tagcloudStateSchemaESQL,
]);

export type TagcloudState = TypeOf<typeof tagcloudStateSchema>;
export type TagcloudStateNoESQL = TypeOf<typeof tagcloudStateSchemaNoESQL>;
export type TagcloudStateESQL = TypeOf<typeof tagcloudStateSchemaESQL>;
