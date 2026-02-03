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
import { esqlColumnOperationWithLabelAndFormatSchema } from '../metric_ops';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import { layerSettingsSchema, sharedPanelInfoSchema, dslOnlyPanelInfoSchema } from '../shared';
import { applyColorToSchema, colorByValueAbsolute } from '../color';
import { horizontalAlignmentSchema, verticalAlignmentSchema } from '../alignments';
import { mergeAllMetricsWithChartDimensionSchema } from './shared';

const legacyMetricStateMetricOptionsSchema = {
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
      { meta: { description: 'Font size for the label and value' }, defaultValue: 'm' }
    )
  ),
  /**
   * Alignment of the label and value for the legacy metric.
   * For example, align the label to the bottom and the value to the right.
   */
  alignments: schema.maybe(
    schema.object({
      /**
       * Alignment for label. Possible values:
       * - 'top': Align label to the top of the value (default)
       * - 'bottom': Align label to the bottom of the value
       */
      labels: verticalAlignmentSchema({
        meta: { description: 'Label alignment' },
        defaultValue: 'top',
      }),
      /**
       * Alignment for value. Possible values:
       * - 'left': Align value to the left (default)
       * - 'center': Align value to the center
       * - 'right': Align value to the right
       */
      value: horizontalAlignmentSchema({
        meta: { description: 'Value alignment' },
        defaultValue: 'left',
      }),
    })
  ),
  /**
   * Where to apply the color (background or value)
   */
  apply_color_to: schema.maybe(applyColorToSchema),
  /**
   * Color configuration
   */
  color: schema.maybe(colorByValueAbsolute),
};

export const legacyMetricStateSchemaNoESQL = schema.object(
  {
    type: schema.literal('legacy_metric'),
    ...sharedPanelInfoSchema,
    ...dslOnlyPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetSchema,
    /**
     * Metric configuration, must define operation.
     */
    metric: mergeAllMetricsWithChartDimensionSchema(legacyMetricStateMetricOptionsSchema),
  },
  { meta: { id: 'legacyMetricNoESQL' } }
);

const esqlLegacyMetricState = schema.object(
  {
    type: schema.literal('legacy_metric'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetEsqlTableSchema,
    /**
     * Metric configuration, must define operation.
     */
    metric: esqlColumnOperationWithLabelAndFormatSchema.extends(
      legacyMetricStateMetricOptionsSchema
    ),
  },
  { meta: { id: 'legacyMetricESQL' } }
);

export const legacyMetricStateSchema = schema.oneOf(
  [legacyMetricStateSchemaNoESQL, esqlLegacyMetricState],
  {
    meta: { id: 'legacyMetricChartSchema' },
  }
);

export type LegacyMetricState = TypeOf<typeof legacyMetricStateSchema>;
export type LegacyMetricStateNoESQL = TypeOf<typeof legacyMetricStateSchemaNoESQL>;
export type LegacyMetricStateESQL = TypeOf<typeof esqlLegacyMetricState>;
