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
  metricOperationDefinitionSchema,
} from '../metric_ops';
import { colorByValueSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import { layerSettingsSchema, sharedPanelInfoSchema } from '../shared';

const gaugeStateSharedOptionsSchema = {
  shape: schema.maybe(
    schema.oneOf([
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
    ])
  ),
};

const gaugeStateMetricOptionsSchema = schema.object({
  /**
   * Sub label
   */
  sub_label: schema.maybe(schema.string({ meta: { description: 'Sub label' } })),
  /**
   * Color configuration
   */
  color: schema.maybe(colorByValueSchema),
  /**
   * Tick marks configuration
   */
  thicks: schema.maybe(
    schema.oneOf([schema.literal('auto'), schema.literal('bands'), schema.literal('hidden')], {
      defaultValue: 'auto',
    })
  ),
  min: schema.maybe(metricOperationDefinitionSchema),
  max: schema.maybe(metricOperationDefinitionSchema),
  goal: schema.maybe(metricOperationDefinitionSchema),
});

export const gaugeStateSchemaNoESQL = schema.object({
  type: schema.literal('gauge'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetSchema,
  ...gaugeStateSharedOptionsSchema,
  /**
   * Primary value configuration, must define operation.
   */
  metric: schema.oneOf([
    // oneOf allows only 12 items
    // so break down metrics based on the type: field-based, reference-based, formula-like
    schema.oneOf([
      schema.allOf([gaugeStateMetricOptionsSchema, countMetricOperationSchema]),
      schema.allOf([gaugeStateMetricOptionsSchema, uniqueCountMetricOperationSchema]),
      schema.allOf([gaugeStateMetricOptionsSchema, metricOperationSchema]),
      schema.allOf([gaugeStateMetricOptionsSchema, sumMetricOperationSchema]),
      schema.allOf([gaugeStateMetricOptionsSchema, lastValueOperationSchema]),
      schema.allOf([gaugeStateMetricOptionsSchema, percentileOperationSchema]),
      schema.allOf([gaugeStateMetricOptionsSchema, percentileRanksOperationSchema]),
    ]),
    schema.oneOf([
      schema.allOf([gaugeStateMetricOptionsSchema, differencesOperationSchema]),
      schema.allOf([gaugeStateMetricOptionsSchema, movingAverageOperationSchema]),
      schema.allOf([gaugeStateMetricOptionsSchema, cumulativeSumOperationSchema]),
      schema.allOf([gaugeStateMetricOptionsSchema, counterRateOperationSchema]),
    ]),
    schema.oneOf([
      schema.allOf([gaugeStateMetricOptionsSchema, staticOperationDefinitionSchema]),
      schema.allOf([gaugeStateMetricOptionsSchema, formulaOperationDefinitionSchema]),
    ]),
  ]),
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
    schema.object(genericOperationOptionsSchema),
    gaugeStateMetricOptionsSchema,
    esqlColumnSchema,
  ]),
});

export const gaugeStateSchema = schema.oneOf([gaugeStateSchemaNoESQL, gaugeStateSchemaESQL]);

export type GaugeState = TypeOf<typeof gaugeStateSchema>;
export type GaugeStateNoESQL = TypeOf<typeof gaugeStateSchemaNoESQL>;
export type GaugeStateESQL = TypeOf<typeof gaugeStateSchemaESQL>;
