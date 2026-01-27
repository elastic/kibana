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
import { LENS_TAGCLOUD_DEFAULT_STATE } from '@kbn/lens-common';
import { esqlColumnOperationWithLabelAndFormatSchema, esqlColumnSchema } from '../metric_ops';
import { colorMappingSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import { dslOnlyPanelInfoSchema, layerSettingsSchema, sharedPanelInfoSchema } from '../shared';
import { builderEnums } from '../enums';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
} from './shared';

const tagcloudStateMetricOptionsSchema = {
  /**
   * Whether to show the metric label
   */
  show_metric_label: schema.maybe(
    schema.boolean({
      meta: { description: 'Show metric label' },
      defaultValue: LENS_TAGCLOUD_DEFAULT_STATE.showLabel,
    })
  ),
};

const tagcloudStateTagsByOptionsSchema = {
  /**
   * Color configuration
   */
  color: schema.maybe(colorMappingSchema),
};

const tagcloudStateSharedOptionsSchema = {
  orientation: schema.maybe(
    builderEnums.orientation({
      meta: { description: 'Orientation of the tagcloud' },
      defaultValue: 'horizontal',
    })
  ),
  font_size: schema.maybe(
    schema.object(
      {
        min: schema.number({
          defaultValue: LENS_TAGCLOUD_DEFAULT_STATE.minFontSize,
          min: 1,
          meta: { description: 'Minimum font size' },
        }),
        max: schema.number({
          defaultValue: LENS_TAGCLOUD_DEFAULT_STATE.maxFontSize,
          max: 120,
          meta: { description: 'Maximum font size' },
        }),
      },
      { meta: { description: 'Minimum and maximum font size for the tags' } }
    )
  ),
};

export const tagcloudStateSchemaNoESQL = schema.object(
  {
    type: schema.literal('tagcloud'),
    ...sharedPanelInfoSchema,
    ...dslOnlyPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetSchema,
    ...tagcloudStateSharedOptionsSchema,
    /**
     * Primary value configuration, must define operation.
     */
    metric: mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
      tagcloudStateMetricOptionsSchema
    ),
    /**
     * Configure how to break down to tags
     */
    tag_by: mergeAllBucketsWithChartDimensionSchema(tagcloudStateTagsByOptionsSchema),
  },
  { meta: { id: 'tagcloudNoESQL' } }
);

export const tagcloudStateSchemaESQL = schema.object(
  {
    type: schema.literal('tagcloud'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetEsqlTableSchema,
    ...tagcloudStateSharedOptionsSchema,
    /**
     * Primary value configuration, must define operation.
     */
    metric: esqlColumnOperationWithLabelAndFormatSchema.extends(tagcloudStateMetricOptionsSchema),
    /**
     * Configure how to break down the metric (e.g. show one metric per term).
     */
    tag_by: esqlColumnSchema.extends(tagcloudStateTagsByOptionsSchema),
  },
  { meta: { id: 'tagcloudESQL' } }
);

export const tagcloudStateSchema = schema.oneOf(
  [tagcloudStateSchemaNoESQL, tagcloudStateSchemaESQL],
  {
    meta: { id: 'tagcloudChartSchema' },
  }
);

export type TagcloudState = TypeOf<typeof tagcloudStateSchema>;
export type TagcloudStateNoESQL = TypeOf<typeof tagcloudStateSchemaNoESQL>;
export type TagcloudStateESQL = TypeOf<typeof tagcloudStateSchemaESQL>;
