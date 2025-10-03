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
  formulaOperationDefinitionSchema,
  lastValueOperationSchema,
  metricOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
  staticOperationDefinitionSchema,
  uniqueCountMetricOperationSchema,
  sumMetricOperationSchema,
  esqlColumnSchema,
  genericOperationOptionsSchema,
} from '../metric_ops';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import { layerSettingsSchema, sharedPanelInfoSchema, dslOnlyPanelInfoSchema } from '../shared';
import { colorByValueSchema } from '../color';

const legacyMetricStateMetricOptionsSchema = schema.object({
  /**
   * Size of the legacy metric label and value. Possible values:
   * - 'xs': Extra small
   * - 's': Small
   * - 'm': Medium (default)
   * - 'l': Large
   * - 'xl': Extra large
   * - 'xxl': Double extra large
   */
  size: schema.oneOf(
    [
      schema.literal('xs'),
      schema.literal('s'),
      schema.literal('m'),
      schema.literal('l'),
      schema.literal('xl'),
      schema.literal('xxl'),
    ],
    { defaultValue: 'm' }
  ),
  /**
   * Alignment of the label and value for the legacy metric.
   * For example, align the label to the bottom and the value to the right.
   */
  alignment: schema.object({
    /**
     * Alignment for label. Possible values:
     * - 'top': Align label to the top of the value (default)
     * - 'bottom': Align label to the bottom of the value
     */
    label: schema.oneOf([schema.literal('top'), schema.literal('bottom')], { defaultValue: 'top' }),
    /**
     * Alignment for value. Possible values:
     * - 'left': Align value to the left (default)
     * - 'center': Align value to the center
     * - 'right': Align value to the right
     */
    value: schema.oneOf(
      [schema.literal('left'), schema.literal('center'), schema.literal('right')],
      {
        defaultValue: 'left',
      }
    ),
  }),
  /**
   * Color configuration
   */
  color: schema.maybe(
    schema.allOf([
      schema.object({
        /**
         * Where to apply the color (background or text)
         */
        apply_color_to: schema.oneOf([schema.literal('background'), schema.literal('text')], {
          meta: { description: 'Apply color to' },
        }),
      }),
      colorByValueSchema,
    ])
  ),
});

export const legacyMetricStateSchemaNoESQL = schema.object({
  type: schema.literal('legacy_metric'),
  ...sharedPanelInfoSchema,
  ...dslOnlyPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetSchema,
  /**
   * Metric configuration, must define operation.
   */
  metric: schema.oneOf([
    // no reference-based metrics for legacy metric
    schema.oneOf([
      schema.allOf([legacyMetricStateMetricOptionsSchema, countMetricOperationSchema]),
      schema.allOf([legacyMetricStateMetricOptionsSchema, uniqueCountMetricOperationSchema]),
      schema.allOf([legacyMetricStateMetricOptionsSchema, metricOperationSchema]),
      schema.allOf([legacyMetricStateMetricOptionsSchema, sumMetricOperationSchema]),
      schema.allOf([legacyMetricStateMetricOptionsSchema, lastValueOperationSchema]),
      schema.allOf([legacyMetricStateMetricOptionsSchema, percentileOperationSchema]),
      schema.allOf([legacyMetricStateMetricOptionsSchema, percentileRanksOperationSchema]),
    ]),
    schema.oneOf([
      schema.allOf([legacyMetricStateMetricOptionsSchema, staticOperationDefinitionSchema]),
      schema.allOf([legacyMetricStateMetricOptionsSchema, formulaOperationDefinitionSchema]),
    ]),
  ]),
});

const esqlLegacyMetricState = schema.object({
  type: schema.literal('legacy_metric'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  /**
   * Metric configuration, must define operation.
   */
  metric: schema.allOf([
    schema.object(genericOperationOptionsSchema),
    legacyMetricStateMetricOptionsSchema,
    esqlColumnSchema,
  ]),
});

export const legacyMetricStateSchema = schema.oneOf([
  legacyMetricStateSchemaNoESQL,
  esqlLegacyMetricState,
]);

export type LegacyMetricState = TypeOf<typeof legacyMetricStateSchema>;
export type LegacyMetricStateNoESQL = TypeOf<typeof legacyMetricStateSchemaNoESQL>;
export type LegacyMetricStateESQL = TypeOf<typeof esqlLegacyMetricState>;
