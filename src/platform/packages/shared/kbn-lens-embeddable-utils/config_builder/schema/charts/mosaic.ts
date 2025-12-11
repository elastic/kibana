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
import {
  legendNestedSchema,
  legendTruncateAfterLinesSchema,
  legendVisibleSchema,
  legendSizeSchema,
  valueDisplaySchema,
} from './partition_shared';

const mosaicStateSharedSchema = {
  legend: schema.maybe(
    schema.object({
      nested: legendNestedSchema,
      truncate_after_lines: legendTruncateAfterLinesSchema,
      visible: legendVisibleSchema,
      size: legendSizeSchema,
    })
  ),
  value_display: valueDisplaySchema,
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

export const mosaicStateSchemaNoESQL = schema.object({
  type: schema.literal('mosaic'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetSchema,
  ...mosaicStateSharedSchema,
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

const mosaicStateSchemaESQL = schema.object({
  type: schema.literal('mosaic'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  ...mosaicStateSharedSchema,
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

export const mosaicStateSchema = schema.oneOf([mosaicStateSchemaNoESQL, mosaicStateSchemaESQL]);

export type MosaicState = TypeOf<typeof mosaicStateSchema>;
export type MosaicStateNoESQL = TypeOf<typeof mosaicStateSchemaNoESQL>;
export type MosaicStateESQL = TypeOf<typeof mosaicStateSchemaESQL>;
