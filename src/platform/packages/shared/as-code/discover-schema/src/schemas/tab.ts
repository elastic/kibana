/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';
import { asCodeQuerySchema } from '@kbn/as-code-shared-schemas';
import { esqlDataSourceSchema, dataViewSchema } from '@kbn/as-code-data-views-schema';
import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import { dataTableSchema, dataTableLimitsSchema } from './data_table';
import { viewModeSchema } from './view_mode';

export const discoverSessionApiClassicTabBaseSchema = z
  .object({
    ...dataTableSchema.shape,
    ...dataTableLimitsSchema.shape,
    query: asCodeQuerySchema.optional(),
    filters: z.array(asCodeFilterSchema).max(100).default([]).meta({
      description: 'List of filters to apply to the data in the tab.',
    }),
    data_source: dataViewSchema.meta({
      description: 'The data view used by the tab, specified by reference or defined inline.',
    }),
    view_mode: viewModeSchema,
  })
  .strict();

export const discoverSessionApiEsqlTabBaseSchema = lazySchema(() => z
  .object({
    ...dataTableSchema.shape,
    ...dataTableLimitsSchema.shape,
    data_source: esqlDataSourceSchema,
  })
  .strict()
  .meta({
    description: 'ES|QL (Elasticsearch Query Language) data source.',
  }));

export const discoverSessionApiTabBaseSchema = lazySchema(() => z.union([
  discoverSessionApiClassicTabBaseSchema,
  discoverSessionApiEsqlTabBaseSchema,
]));
