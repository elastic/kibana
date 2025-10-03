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
import { layerSettingsSchema, sharedPanelInfoSchema } from '../shared';
import { colorByValueSchema } from '../color';

const legacyMetricStateValueOptionsSchema = schema.object({
  /**
   * Size of the legacy metric label and value. Possible values:
   * - 'xs': Extra small
   * - 's': Small
   * - 'm': Medium (default)
   * - 'l': Large
   * - 'xl': Extra large
   * - 'xxl': Double extra large
   */
  size: schema.maybe(
    schema.oneOf(
      [
        schema.literal('xs'),
        schema.literal('s'),
        schema.literal('m'),
        schema.literal('l'),
        schema.literal('xl'),
        schema.literal('xxl'),
      ],
      { defaultValue: 'm' }
    )
  ),
  /**
   * Alignments of the label and value for the legacy metric.
   * For example, align the labels to the left and the values to the right.
   */
  alignment: schema.maybe(
    schema.object({
      /**
       * Alignments for label. Possible values:
       * - 'top': Align label to the top of the value (default)
       * - 'bottom': Align label to the bottom of the value
       */
      label: schema.maybe(
        schema.oneOf([schema.literal('top'), schema.literal('bottom')], { defaultValue: 'top' })
      ),
      /**
       * Alignments for value. Possible values:
       * - 'left': Align value to the left (default)
       * - 'center': Align value to the center
       * - 'right': Align value to the right
       */
      value: schema.maybe(
        schema.oneOf([schema.literal('left'), schema.literal('center'), schema.literal('right')], {
          defaultValue: 'left',
        })
      ),
    })
  ),
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
  ...layerSettingsSchema,
  ...datasetSchema,
  /**
   * Value configuration, must define operation.
   */
  value: schema.oneOf([
    // oneOf allows only 12 items
    // so break down metrics based on the type: field-based, formula-like
    schema.oneOf([
      schema.allOf([legacyMetricStateValueOptionsSchema, countMetricOperationSchema]),
      schema.allOf([legacyMetricStateValueOptionsSchema, uniqueCountMetricOperationSchema]),
      schema.allOf([legacyMetricStateValueOptionsSchema, metricOperationSchema]),
      schema.allOf([legacyMetricStateValueOptionsSchema, sumMetricOperationSchema]),
      schema.allOf([legacyMetricStateValueOptionsSchema, lastValueOperationSchema]),
      schema.allOf([legacyMetricStateValueOptionsSchema, percentileOperationSchema]),
      schema.allOf([legacyMetricStateValueOptionsSchema, percentileRanksOperationSchema]),
    ]),
    schema.oneOf([
      schema.allOf([legacyMetricStateValueOptionsSchema, staticOperationDefinitionSchema]),
      schema.allOf([legacyMetricStateValueOptionsSchema, formulaOperationDefinitionSchema]),
    ]),
  ]),
});

const esqlLegacyMetricState = schema.object({
  type: schema.literal('metric'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  /**
   * Value configuration, must define operation.
   */
  value: schema.allOf([
    schema.object(genericOperationOptionsSchema),
    legacyMetricStateValueOptionsSchema,
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
