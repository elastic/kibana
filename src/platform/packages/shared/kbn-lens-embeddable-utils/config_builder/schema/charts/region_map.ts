/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
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
  fieldMetricOrFormulaOperationDefinitionSchema,
  esqlColumnSchema,
  genericOperationOptionsSchema,
} from '../metric_ops';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import { dslOnlyPanelInfoSchema, layerSettingsSchema, sharedPanelInfoSchema } from '../shared';
import { mergeAllBucketsWithChartDimensionSchema } from './shared';

const regionMapStateRegionOptionsSchema = schema.object({
  ems: schema.maybe(
    schema.object({
      boundaries: schema.string({ meta: { description: 'EMS boundaries' } }),
      join: schema.maybe(schema.string({ meta: { description: 'EMS join field' } })),
    })
  ),
});

export const regionMapStateSchemaNoESQL = schema.object({
  type: schema.literal('region_map'),
  ...sharedPanelInfoSchema,
  ...dslOnlyPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetSchema,
  /**
   * Metric configuration
   */
  metric: fieldMetricOrFormulaOperationDefinitionSchema,
  /**
   * Configure how to break down to regions
   */
  region: mergeAllBucketsWithChartDimensionSchema(regionMapStateRegionOptionsSchema),
});

const regionMapStateSchemaESQL = schema.object({
  type: schema.literal('region_map'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  /**
   * Metric configuration
   */
  metric: schema.allOf([schema.object(genericOperationOptionsSchema), esqlColumnSchema]),
  /**
   * Configure how to break down to regions
   */
  region: schema.maybe(schema.allOf([regionMapStateRegionOptionsSchema, esqlColumnSchema])),
});

export const regionMapStateSchema = schema.oneOf([
  regionMapStateSchemaNoESQL,
  regionMapStateSchemaESQL,
]);

export type RegionMapState = TypeOf<typeof regionMapStateSchema>;
export type RegionMapStateNoESQL = TypeOf<typeof regionMapStateSchemaNoESQL>;
export type RegionMapStateESQL = TypeOf<typeof regionMapStateSchemaESQL>;
