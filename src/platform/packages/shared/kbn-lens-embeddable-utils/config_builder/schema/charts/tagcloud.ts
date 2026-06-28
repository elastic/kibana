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
<<<<<<< HEAD
        meta: { description: 'Orientation of the tagcloud.' },
=======
        meta: { description: 'Orientation of the tagcloud' },
>>>>>>> 9.4
        defaultValue: 'horizontal',
      })
    ),
    font_size: schema.maybe(
      schema.object(
        {
          min: schema.number({
            defaultValue: LENS_TAGCLOUD_DEFAULT_STATE.minFontSize,
            min: 1,
<<<<<<< HEAD
            meta: { description: 'Minimum font size.' },
=======
            meta: { description: 'Minimum font size' },
>>>>>>> 9.4
          }),
          max: schema.number({
            defaultValue: LENS_TAGCLOUD_DEFAULT_STATE.maxFontSize,
            max: 120,
<<<<<<< HEAD
            meta: { description: 'Maximum font size.' },
          }),
        },
        { meta: { description: 'Font size range for tags.' } }
=======
            meta: { description: 'Maximum font size' },
          }),
        },
        { meta: { description: 'Minimum and maximum font size for the tags' } }
>>>>>>> 9.4
      )
    ),
    /**
     * Show the metric caption
     */
    caption: schema.maybe(
      schema.object(
        {
          visible: schema.boolean({
<<<<<<< HEAD
            meta: { description: 'When `true`, displays the caption.' },
=======
            meta: { description: 'Show caption' },
>>>>>>> 9.4
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
<<<<<<< HEAD
    tag_by: mergeAllBucketsWithChartDimensionSchema(
      tagcloudConfigTagsByOptionsSchema,
      'tagcloudTag'
    ),
=======
    tag_by: mergeAllBucketsWithChartDimensionSchema(tagcloudConfigTagsByOptionsSchema),
>>>>>>> 9.4
  },
  {
    meta: {
      id: 'tagcloudNoESQL',
      title: 'Tag Cloud Chart (DSL)',
      description: 'Tag Cloud configuration using a data view.',
    },
  }
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
<<<<<<< HEAD
=======
  { meta: { id: 'tagcloudESQL', title: 'Tag Cloud Chart (ES|QL)' } }
);

export const tagcloudConfigSchema = objectUnion(
  [tagcloudConfigSchemaNoESQL, tagcloudConfigSchemaESQL],
>>>>>>> 9.4
  {
    meta: {
      id: 'tagcloudESQL',
      title: 'Tag Cloud Chart (ES|QL)',
      description: 'Tag Cloud configuration using an ES|QL query.',
    },
  }
);

<<<<<<< HEAD
export const tagcloudConfigSchema = objectUnion(
  [tagcloudConfigSchemaNoESQL, tagcloudConfigSchemaESQL],
  {
    meta: {
      id: 'tagcloudChart',
      title: 'Tag Cloud Chart',
      description: 'A word cloud with terms sized by metric value.',
    },
  }
);

=======
>>>>>>> 9.4
export type TagcloudConfig = TypeOf<typeof tagcloudConfigSchema>;
export type TagcloudConfigNoESQL = TypeOf<typeof tagcloudConfigSchemaNoESQL>;
export type TagcloudConfigESQL = TypeOf<typeof tagcloudConfigSchemaESQL>;
