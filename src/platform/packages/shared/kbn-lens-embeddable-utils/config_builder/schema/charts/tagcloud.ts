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
import {
  countMetricOperationSchema,
  counterRateOperationSchema,
  cumulativeSumOperationSchema,
  differencesOperationSchema,
  formulaOperationDefinitionSchema,
  lastValueOperationSchema,
  metricOperationSchema,
  movingAverageOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
  staticOperationDefinitionSchema,
  uniqueCountMetricOperationSchema,
  sumMetricOperationSchema,
  esqlColumnSchema,
  genericOperationOptionsSchema,
} from '../metric_ops';
import { coloringTypeSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import {
  bucketDateHistogramOperationSchema,
  bucketTermsOperationSchema,
  bucketHistogramOperationSchema,
  bucketRangesOperationSchema,
  bucketFiltersOperationSchema,
} from '../bucket_ops';
import { layerSettingsSchema, sharedPanelInfoSchema } from '../shared';

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
  color: schema.maybe(coloringTypeSchema),
});

const tagcloudStateSharedOptionsSchema = {
  /** Orientation of the tagcloud */
  orientation: schema.maybe(
    schema.oneOf([
      schema.literal('horizontal'),
      schema.literal('vertical'),
      schema.literal('right_angled'),
    ])
  ),
  /** Font size configuration */
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
  ...layerSettingsSchema,
  ...datasetSchema,
  ...tagcloudStateSharedOptionsSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metric: schema.oneOf([
    // oneOf allows only 12 items
    // so break down metrics based on the type: field-based, reference-based, formula-like
    schema.oneOf([
      schema.allOf([tagcloudStateMetricOptionsSchema, countMetricOperationSchema]),
      schema.allOf([tagcloudStateMetricOptionsSchema, uniqueCountMetricOperationSchema]),
      schema.allOf([tagcloudStateMetricOptionsSchema, metricOperationSchema]),
      schema.allOf([tagcloudStateMetricOptionsSchema, sumMetricOperationSchema]),
      schema.allOf([tagcloudStateMetricOptionsSchema, lastValueOperationSchema]),
      schema.allOf([tagcloudStateMetricOptionsSchema, percentileOperationSchema]),
      schema.allOf([tagcloudStateMetricOptionsSchema, percentileRanksOperationSchema]),
    ]),
    schema.oneOf([
      schema.allOf([tagcloudStateMetricOptionsSchema, differencesOperationSchema]),
      schema.allOf([tagcloudStateMetricOptionsSchema, movingAverageOperationSchema]),
      schema.allOf([tagcloudStateMetricOptionsSchema, cumulativeSumOperationSchema]),
      schema.allOf([tagcloudStateMetricOptionsSchema, counterRateOperationSchema]),
    ]),
    schema.oneOf([
      schema.allOf([tagcloudStateMetricOptionsSchema, staticOperationDefinitionSchema]),
      schema.allOf([tagcloudStateMetricOptionsSchema, formulaOperationDefinitionSchema]),
    ]),
  ]),
  /**
   * Configure how to break down to tags
   */
  tag_by: schema.maybe(
    schema.oneOf([
      schema.allOf([tagcloudStateTagsByOptionsSchema, bucketDateHistogramOperationSchema]),
      schema.allOf([tagcloudStateTagsByOptionsSchema, bucketTermsOperationSchema]),
      schema.allOf([tagcloudStateTagsByOptionsSchema, bucketHistogramOperationSchema]),
      schema.allOf([tagcloudStateTagsByOptionsSchema, bucketRangesOperationSchema]),
      schema.allOf([tagcloudStateTagsByOptionsSchema, bucketFiltersOperationSchema]),
    ])
  ),
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
