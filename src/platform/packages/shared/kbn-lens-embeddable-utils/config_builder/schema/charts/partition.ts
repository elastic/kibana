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
import { colorByValueSchema, colorMappingSchema, staticColorSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import {
  bucketDateHistogramOperationSchema,
  bucketTermsOperationSchema,
  bucketHistogramOperationSchema,
  bucketRangesOperationSchema,
  bucketFiltersOperationSchema,
} from '../bucket_ops';
import { collapseBySchema, layerSettingsSchema, sharedPanelInfoSchema } from '../shared';

const partitionStateSharedOptionsSchema = {
  legend: schema.maybe(
    schema.object({
      nested: schema.maybe(
        schema.boolean({
          defaultValue: false,
        })
      ),
      // available only for waffle chart
      values: schema.maybe(
        schema.arrayOf(schema.oneOf([schema.literal('absolute')]), {
          minSize: 1,
          maxSize: 1,
        })
      ),
    })
  ),
  value_display: schema.maybe(
    schema.object({
      mode: schema.oneOf([
        schema.literal('hidden'),
        schema.literal('absolute'),
        schema.literal('percentage'),
      ]),
      percent_decimals: schema.maybe(
        schema.number({
          defaultValue: 2,
          min: 0,
          max: 10,
        })
      ),
    })
  ),
  /**
   * Position of the labels, only for pie/donut charts
   */
  label_position: schema.maybe(
    schema.oneOf([schema.literal('hidden'), schema.literal('inside'), schema.literal('outside')])
  ),
  /**
   * Size of the donut hole, only for pie/donut charts
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

export const partitionStateSchemaNoESQL = schema.object({
  type: schema.oneOf([
    schema.literal('pie'),
    schema.literal('treemap'),
    schema.literal('waffle'),
    schema.literal('mosaic'),
  ]),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetSchema,
  ...partitionStateSharedOptionsSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metrics: schema.arrayOf(
    schema.oneOf([
      // oneOf allows only 12 items
      // so break down metrics based on the type: field-based, reference-based, formula-like
      schema.oneOf([
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, countMetricOperationSchema]),
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, uniqueCountMetricOperationSchema]),
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, metricOperationSchema]),
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, sumMetricOperationSchema]),
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, lastValueOperationSchema]),
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, percentileOperationSchema]),
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, percentileRanksOperationSchema]),
      ]),
      schema.oneOf([
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, differencesOperationSchema]),
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, movingAverageOperationSchema]),
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, cumulativeSumOperationSchema]),
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, counterRateOperationSchema]),
      ]),
      schema.oneOf([
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, staticOperationDefinitionSchema]),
        schema.allOf([partitionStatePrimaryMetricOptionsSchema, formulaOperationDefinitionSchema]),
      ]),
    ]),
    { minSize: 1 }
  ),
  /**
   * Configure how to break down the metric (e.g. show one metric per term).
   */
  group_by: schema.arrayOf(
    schema.maybe(
      schema.oneOf([
        schema.allOf([partitionStateBreakdownByOptionsSchema, bucketDateHistogramOperationSchema]),
        schema.allOf([partitionStateBreakdownByOptionsSchema, bucketTermsOperationSchema]),
        schema.allOf([partitionStateBreakdownByOptionsSchema, bucketHistogramOperationSchema]),
        schema.allOf([partitionStateBreakdownByOptionsSchema, bucketRangesOperationSchema]),
        schema.allOf([partitionStateBreakdownByOptionsSchema, bucketFiltersOperationSchema]),
      ])
    ),
    { minSize: 1 }
  ),
});

const partitionStateSchemaESQL = schema.object({
  type: schema.oneOf([
    schema.literal('pie'),
    schema.literal('treemap'),
    schema.literal('waffle'),
    schema.literal('mosaic'),
  ]),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  ...partitionStateSharedOptionsSchema,
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

export const partitionStateSchema = schema.oneOf([
  partitionStateSchemaNoESQL,
  partitionStateSchemaESQL,
]);

export type PartitionState = TypeOf<typeof partitionStateSchema>;
export type PartitionStateNoESQL = TypeOf<typeof partitionStateSchemaNoESQL>;
export type PartitionStateESQL = TypeOf<typeof partitionStateSchemaESQL>;
