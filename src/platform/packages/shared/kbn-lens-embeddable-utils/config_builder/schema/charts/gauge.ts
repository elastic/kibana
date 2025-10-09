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
import { esqlColumnSchema, metricOperationDefinitionSchema } from '../metric_ops';
import { colorByValueSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import { layerSettingsSchema, sharedPanelInfoSchema } from '../shared';
import { mergeAllMetricsWithChartDimensionSchema } from './shared';

const gaugeStateSharedOptionsSchema = {
  shape: schema.maybe(
    schema.oneOf(
      [
        schema.object({
          type: schema.literal('bullet'),
          direction: schema.oneOf([schema.literal('horizontal'), schema.literal('vertical')], {
            defaultValue: 'horizontal',
          }),
        }),
        schema.object({
          type: schema.oneOf([
            schema.literal('circle'),
            schema.literal('semiCircle'),
            schema.literal('arc'),
          ]),
        }),
      ],
      { defaultValue: { type: 'bullet', direction: 'horizontal' } }
    )
  ),
};

const gaugeStateMetricInnerNoESQLOpsSchema = {
  /**
   * Minimum value for the gauge
   * Note: label, format and other visual options are ignored
   */
  min: schema.maybe(metricOperationDefinitionSchema),
  /**
   * Maximum value for the gauge
   * Note: label, format and other visual options are ignored
   */
  max: schema.maybe(metricOperationDefinitionSchema),
  /**
   * Goal value for the gauge
   * Note: label, format and other visual options are ignored
   */
  goal: schema.maybe(metricOperationDefinitionSchema),
};

const gaugeStateMetricInnerESQLOpsSchema = {
  /**
   * Minimum value for the gauge
   * Note: label, format and other visual options are ignored
   */
  min: schema.maybe(esqlColumnSchema),
  /**
   * Maximum value for the gauge
   * Note: label, format and other visual options are ignored
   */
  max: schema.maybe(esqlColumnSchema),
  /**
   * Goal value for the gauge
   * Note: label, format and other visual options are ignored
   */
  goal: schema.maybe(esqlColumnSchema),
};

const gaugeStateMetricOptionsSchema = {
  /**
   * Title (overrides label on chart panel, but not in table)
   */
  title: schema.maybe(schema.string({ meta: { description: 'Title' } })),
  /**
   * Sub title
   */
  sub_title: schema.maybe(schema.string({ meta: { description: 'Sub title' } })),
  /**
   * Color configuration
   */
  color: schema.maybe(colorByValueSchema),
  /**
   * Tick marks configuration
   */
  ticks: schema.maybe(
    schema.oneOf([schema.literal('auto'), schema.literal('bands'), schema.literal('hidden')], {
      defaultValue: 'auto',
    })
  ),
};

export const gaugeStateSchemaNoESQL = schema.object({
  type: schema.literal('gauge'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetSchema,
  ...gaugeStateSharedOptionsSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metric: mergeAllMetricsWithChartDimensionSchema(
    schema.object({
      ...gaugeStateMetricOptionsSchema,
      ...gaugeStateMetricInnerNoESQLOpsSchema,
    })
  ),
});

const gaugeStateSchemaESQL = schema.object({
  type: schema.literal('gauge'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  ...gaugeStateSharedOptionsSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metric: schema.allOf([
    schema.object({
      ...gaugeStateMetricOptionsSchema,
      ...gaugeStateMetricInnerESQLOpsSchema,
    }),
    esqlColumnSchema,
  ]),
});

export const gaugeStateSchema = schema.oneOf([gaugeStateSchemaNoESQL, gaugeStateSchemaESQL]);

export type GaugeState = TypeOf<typeof gaugeStateSchema>;
export type GaugeStateNoESQL = TypeOf<typeof gaugeStateSchemaNoESQL>;
export type GaugeStateESQL = TypeOf<typeof gaugeStateSchemaESQL>;
