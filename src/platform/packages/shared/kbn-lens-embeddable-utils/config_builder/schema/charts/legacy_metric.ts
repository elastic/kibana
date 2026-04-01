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
import { esqlColumnWithFormatSchema } from '../metric_ops';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import { layerSettingsSchema, sharedPanelInfoSchema, dslOnlyPanelInfoSchema } from '../shared';
import {
  applyColorToSchema,
  colorByValueAbsoluteSchema,
  legacyColorByValueAbsoluteSchema,
} from '../color';
import { horizontalAlignmentSchema, verticalAlignmentSchema } from '../alignments';
import { mergeAllMetricsWithChartDimensionSchema } from './shared';

const legacyMetricStateMetricOptionsSchema = {
  /**
   * Font scale for the legacy metric label and value.
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
  labels: schema.maybe(
    schema.object(
      {
        /**
         * Alignment for labels. Possible values:
         * - 'top': Align label to the top of the value (default)
         * - 'bottom': Align label to the bottom of the value
         */
        alignment: verticalAlignmentSchema({
          meta: { description: 'Label alignment' },
          defaultValue: 'top',
        }),
      },
      { meta: { description: 'Labels configuration' } }
    )
  ),
  values: schema.maybe(
    schema.object(
      {
        /**
         * Alignment for values. Possible values:
         * - 'left': Align value to the left (default)
         * - 'center': Align value to the center
         * - 'right': Align value to the right
         */
        alignment: horizontalAlignmentSchema({
          meta: { description: 'Value alignment' },
          defaultValue: 'left',
        }),
      },
      { meta: { description: 'Values configuration' } }
    )
  ),
  /**
   * Where to apply the color (background or value)
   */
  apply_color_to: schema.maybe(applyColorToSchema),
  /**
   * Color configuration
   */
  color: schema.maybe(schema.oneOf([colorByValueAbsoluteSchema, legacyColorByValueAbsoluteSchema])),
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
  { meta: { id: 'legacyMetricNoESQL', title: 'Legacy Metric Chart (DSL)' } }
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
    metric: esqlColumnWithFormatSchema.extends(legacyMetricStateMetricOptionsSchema),
  },
  { meta: { id: 'legacyMetricESQL', title: 'Legacy Metric Chart (ES|QL)' } }
);

export const legacyMetricStateSchema = schema.oneOf(
  [legacyMetricStateSchemaNoESQL, esqlLegacyMetricState],
  {
    meta: { id: 'legacyMetricChart', title: 'Legacy Metric Chart' },
  }
);

export type LegacyMetricState = TypeOf<typeof legacyMetricStateSchema>;
export type LegacyMetricStateNoESQL = TypeOf<typeof legacyMetricStateSchemaNoESQL>;
export type LegacyMetricStateESQL = TypeOf<typeof esqlLegacyMetricState>;
