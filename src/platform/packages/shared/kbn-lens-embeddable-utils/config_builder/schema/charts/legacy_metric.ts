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
import { dataSourceSchema, dataSourceEsqlTableSchema } from '../data_source';
import { layerSettingsSchema, sharedPanelInfoSchema, dslOnlyPanelInfoSchema } from '../shared';
import {
  applyColorToSchema,
  colorByValueAbsoluteSchema,
  legacyColorByValueAbsoluteSchema,
  autoColorSchema,
  AUTO_COLOR,
} from '../color';
import { horizontalAlignmentSchema, verticalAlignmentSchema } from '../alignments';
import { mergeAllMetricsWithChartDimensionSchema } from './shared';
import { objectUnion } from './utils/object_union';

const legacyMetricConfigMetricOptionsSchema = {
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
  color: schema.maybe(
    schema.oneOf([colorByValueAbsoluteSchema, legacyColorByValueAbsoluteSchema, autoColorSchema], {
      defaultValue: AUTO_COLOR,
    })
  ),
};

export const legacyMetricConfigSchemaNoESQL = schema.object(
  {
    type: schema.literal('legacy_metric'),
    ...sharedPanelInfoSchema,
    ...dslOnlyPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceSchema,
    /**
     * Metric configuration, must define operation.
     */
    metric: mergeAllMetricsWithChartDimensionSchema(legacyMetricConfigMetricOptionsSchema),
  },
  { meta: { id: 'legacyMetricNoESQL', title: 'Legacy Metric Chart (DSL)' } }
);

const esqlLegacyMetricConfig = schema.object(
  {
    type: schema.literal('legacy_metric'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceEsqlTableSchema,
    /**
     * Metric configuration, must define operation.
     */
    metric: esqlColumnWithFormatSchema.extends(legacyMetricConfigMetricOptionsSchema),
  },
  { meta: { id: 'legacyMetricESQL', title: 'Legacy Metric Chart (ES|QL)' } }
);

// Legacy metric is not currently supported for ES|QL datasets
export const legacyMetricConfigSchema = objectUnion([legacyMetricConfigSchemaNoESQL], {
  meta: { id: 'legacyMetricChart', title: 'Legacy Metric Chart' },
});

export type LegacyMetricConfig = TypeOf<typeof legacyMetricConfigSchema>;
export type LegacyMetricConfigNoESQL = TypeOf<typeof legacyMetricConfigSchemaNoESQL>;
export type LegacyMetricConfigESQL = TypeOf<typeof esqlLegacyMetricConfig>;
