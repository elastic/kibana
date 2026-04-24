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
  esqlColumnWithFormatSchema,
} from '../metric_ops';
import { dataSourceSchema, dataSourceEsqlTableSchema } from '../data_source';
import { dslOnlyPanelInfoSchema, layerSettingsSchema, sharedPanelInfoSchema } from '../shared';
import { mergeAllBucketsWithChartDimensionSchema } from './shared';
import { objectUnion } from './utils/object_union';

const regionMapConfigRegionOptionsSchema = {
  ems: schema.maybe(
    schema.object({
      boundaries: schema.string({ meta: { description: 'EMS boundaries' } }),
      join: schema.string({ meta: { description: 'EMS join field' } }),
    })
  ),
};

export const regionMapConfigSchemaNoESQL = schema.object(
  {
    type: schema.literal('region_map'),
    ...sharedPanelInfoSchema,
    ...dslOnlyPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceSchema,
    /**
     * Metric configuration
     */
    metric: fieldMetricOrFormulaOperationDefinitionSchema,
    /**
     * Configure how to break down to regions
     */
    region: mergeAllBucketsWithChartDimensionSchema(regionMapConfigRegionOptionsSchema),
  },
  { meta: { id: 'regionMapNoESQL', title: 'Region Map (DSL)' } }
);

export const regionMapConfigSchemaESQL = schema.object(
  {
    type: schema.literal('region_map'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceEsqlTableSchema,
    /**
     * Metric configuration
     */
    metric: esqlColumnWithFormatSchema,
    /**
     * Configure how to break down to regions
     */
    region: esqlColumnSchema.extends(regionMapConfigRegionOptionsSchema),
  },
  { meta: { id: 'regionMapESQL', title: 'Region Map (ES|QL)' } }
);

export const regionMapConfigSchema = objectUnion(
  [regionMapConfigSchemaNoESQL, regionMapConfigSchemaESQL],
  { meta: { id: 'regionMapChart', title: 'Region Map' } }
);

export type RegionMapConfig = TypeOf<typeof regionMapConfigSchema>;
export type RegionMapConfigNoESQL = TypeOf<typeof regionMapConfigSchemaNoESQL>;
export type RegionMapConfigESQL = TypeOf<typeof regionMapConfigSchemaESQL>;
