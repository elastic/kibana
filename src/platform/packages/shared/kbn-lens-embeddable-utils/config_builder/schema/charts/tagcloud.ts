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
import { esqlColumnWithFormatSchema } from '../metric_ops';
import { colorMappingSchema } from '../color';
import { dataSourceSchema, dataSourceEsqlTableSchema } from '../data_source';
import { dslOnlyPanelInfoSchema, layerSettingsSchema, sharedPanelInfoSchema } from '../shared';
import { builderEnums } from '../enums';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
} from './shared';
import { objectUnion } from './utils/object_union';

const tagcloudConfigTagsByOptionsSchema = {
  /**
   * Color configuration
   */
  color: schema.maybe(colorMappingSchema),
};

const tagcloudStylingSchema = schema.object(
  {
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
    /**
     * Show the metric caption
     */
    caption: schema.maybe(
      schema.object(
        {
          visible: schema.boolean({
            meta: { description: 'Show caption' },
            defaultValue: LENS_TAGCLOUD_DEFAULT_STATE.showCaption,
          }),
        },
        {
          meta: {
            description:
              'Caption configuration representing the metric and the tag_by operations labels',
          },
        }
      )
    ),
  },
  {
    meta: {
      id: 'tagcloudStyling',
      title: 'Tag cloud styling',
      description: 'Visual chart styling options',
    },
  }
);

export const tagcloudConfigSchemaNoESQL = schema.object(
  {
    type: schema.literal('tag_cloud'),
    ...sharedPanelInfoSchema,
    ...dslOnlyPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceSchema,
    styling: schema.maybe(tagcloudStylingSchema),
    /**
     * Primary value configuration, must define operation.
     */
    metric: mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps({}, 'tagcloudMetric'),
    /**
     * Configure how to break down to tags
     */
    tag_by: mergeAllBucketsWithChartDimensionSchema(
      tagcloudConfigTagsByOptionsSchema,
      'tagcloudTag'
    ),
  },
  { meta: { id: 'tagcloudNoESQL', title: 'Tag Cloud Chart (DSL)' } }
);

export const tagcloudConfigSchemaESQL = schema.object(
  {
    type: schema.literal('tag_cloud'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceEsqlTableSchema,
    styling: schema.maybe(tagcloudStylingSchema),
    /**
     * Primary value configuration, must define operation.
     */
    metric: esqlColumnWithFormatSchema,
    /**
     * Configure how to break down the metric (e.g. show one metric per term).
     */
    tag_by: esqlColumnWithFormatSchema.extends(tagcloudConfigTagsByOptionsSchema),
  },
  { meta: { id: 'tagcloudESQL', title: 'Tag Cloud Chart (ES|QL)' } }
);

export const tagcloudConfigSchema = objectUnion(
  [tagcloudConfigSchemaNoESQL, tagcloudConfigSchemaESQL],
  {
    meta: { id: 'tagcloudChart', title: 'Tag Cloud Chart' },
  }
);

export type TagcloudConfig = TypeOf<typeof tagcloudConfigSchema>;
export type TagcloudConfigNoESQL = TypeOf<typeof tagcloudConfigSchemaNoESQL>;
export type TagcloudConfigESQL = TypeOf<typeof tagcloudConfigSchemaESQL>;
