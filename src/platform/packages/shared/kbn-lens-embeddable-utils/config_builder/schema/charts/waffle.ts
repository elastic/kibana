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
  legendTruncateAfterLinesSchema,
  legendVisibleSchema,
  legendSizeSchema,
  valueDisplaySchema,
} from './partition_shared';

/**
 * Shared visualization options for partition charts including legend and value display
 */
export const waffleStateSharedSchema = {
  legend: schema.maybe(
    schema.object(
      {
        values: schema.maybe(
          schema.arrayOf(
            schema.oneOf([schema.literal('absolute')], {
              meta: {
                description:
                  'Legend value display mode: absolute (show raw metric values in legend)',
              },
            }),
            { minSize: 1, maxSize: 1 }
          )
        ),
        truncate_after_lines: legendTruncateAfterLinesSchema,
        visible: legendVisibleSchema,
        size: legendSizeSchema,
      },
      { meta: { description: 'Legend configuration for waffle chart' } }
    )
  ),
  value_display: valueDisplaySchema,
};

/**
 * Color configuration for primary metric in waffle chart
 */
const partitionStatePrimaryMetricOptionsSchema = schema.object(
  {
    color: schema.maybe(staticColorSchema),
  },
  { meta: { description: 'Primary metric visual options including static color' } }
);

/**
 * Breakdown configuration including color mapping and collapse behavior
 */
const partitionStateBreakdownByOptionsSchema = schema.object(
  {
    color: schema.maybe(
      schema.oneOf([colorByValueSchema, colorMappingSchema], {
        meta: {
          description: 'Color configuration: by value (palette-based) or mapping (custom rules)',
        },
      })
    ),
    collapse_by: schema.maybe(collapseBySchema),
  },
  { meta: { description: 'Breakdown dimension options with color and collapse configuration' } }
);

/**
 * Waffle chart configuration for standard (non-ES|QL) queries
 */
export const waffleStateSchemaNoESQL = schema.object(
  {
    type: schema.literal('waffle'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetSchema,
    ...waffleStateSharedSchema,
    metrics: schema.arrayOf(
      schema.oneOf(
        [
          schema.oneOf(
            [
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, countMetricOperationSchema]),
              schema.allOf([
                partitionStatePrimaryMetricOptionsSchema,
                uniqueCountMetricOperationSchema,
              ]),
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, metricOperationSchema]),
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, sumMetricOperationSchema]),
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, lastValueOperationSchema]),
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, percentileOperationSchema]),
              schema.allOf([
                partitionStatePrimaryMetricOptionsSchema,
                percentileRanksOperationSchema,
              ]),
            ],
            {
              meta: {
                description:
                  'Field-based metrics: count, unique_count, average, min, max, median, sum, standard_deviation, last_value, percentile, percentile_rank',
              },
            }
          ),
          schema.oneOf(
            [
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, differencesOperationSchema]),
              schema.allOf([
                partitionStatePrimaryMetricOptionsSchema,
                movingAverageOperationSchema,
              ]),
              schema.allOf([
                partitionStatePrimaryMetricOptionsSchema,
                cumulativeSumOperationSchema,
              ]),
              schema.allOf([partitionStatePrimaryMetricOptionsSchema, counterRateOperationSchema]),
            ],
            {
              meta: {
                description:
                  'Reference-based metrics: differences, moving_average, cumulative_sum, counter_rate',
              },
            }
          ),
          schema.oneOf(
            [
              schema.allOf([
                partitionStatePrimaryMetricOptionsSchema,
                staticOperationDefinitionSchema,
              ]),
              schema.allOf([
                partitionStatePrimaryMetricOptionsSchema,
                formulaOperationDefinitionSchema,
              ]),
            ],
            { meta: { description: 'Calculated metrics: static_value, formula' } }
          ),
        ],
        { meta: { description: 'Metric operations for waffle chart primary value' } }
      ),
      { minSize: 1, meta: { description: 'Array of metric configurations (minimum 1)' } }
    ),
    group_by: schema.maybe(
      schema.arrayOf(
        schema.maybe(
          schema.oneOf(
            [
              schema.allOf([
                partitionStateBreakdownByOptionsSchema,
                bucketDateHistogramOperationSchema,
              ]),
              schema.allOf([partitionStateBreakdownByOptionsSchema, bucketTermsOperationSchema]),
              schema.allOf([
                partitionStateBreakdownByOptionsSchema,
                bucketHistogramOperationSchema,
              ]),
              schema.allOf([partitionStateBreakdownByOptionsSchema, bucketRangesOperationSchema]),
              schema.allOf([partitionStateBreakdownByOptionsSchema, bucketFiltersOperationSchema]),
            ],
            {
              meta: {
                description:
                  'Breakdown operations: date_histogram, terms, histogram, range, filters',
              },
            }
          )
        ),
        { minSize: 1, meta: { description: 'Array of breakdown dimensions (minimum 1)' } }
      )
    ),
  },
  { meta: { description: 'Waffle chart configuration for standard queries' } }
);

/**
 * Waffle chart configuration for ES|QL queries
 */
const waffleStateSchemaESQL = schema.object(
  {
    type: schema.literal('waffle'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetEsqlTableSchema,
    ...waffleStateSharedSchema,
    metrics: schema.allOf(
      [
        schema.object(genericOperationOptionsSchema),
        partitionStatePrimaryMetricOptionsSchema,
        esqlColumnSchema,
      ],
      { meta: { description: 'ES|QL column reference for primary metric' } }
    ),
    group_by: schema.maybe(
      schema.arrayOf(
        schema.allOf([partitionStateBreakdownByOptionsSchema, esqlColumnSchema], {
          meta: { description: 'ES|QL column reference for breakdown dimension' },
        }),
        { minSize: 1, meta: { description: 'Array of ES|QL breakdown columns (minimum 1)' } }
      )
    ),
  },
  { meta: { description: 'Waffle chart configuration for ES|QL queries' } }
);

/**
 * Complete waffle chart configuration supporting both standard and ES|QL queries
 */
export const waffleStateSchema = schema.oneOf([waffleStateSchemaNoESQL, waffleStateSchemaESQL], {
  meta: { description: 'Waffle chart state: standard query or ES|QL query' },
});

export type WaffleState = TypeOf<typeof waffleStateSchema>;
export type WaffleStateNoESQL = TypeOf<typeof waffleStateSchemaNoESQL>;
export type WaffleStateESQL = TypeOf<typeof waffleStateSchemaESQL>;
