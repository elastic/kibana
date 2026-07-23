/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedDataViewSpecSchema } from '@kbn/as-code-data-views-schema';
import { schema } from '@kbn/config-schema';
import {
  asCodeMetaSchema,
  asCodePaginationResponseMetaSchema,
  PAGINATION_MAX_SIZE,
} from '@kbn/as-code-shared-schemas';

const dataViewsMetaSchema = asCodeMetaSchema.extends({
  namespaces: schema.maybe(schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 100 })),
});

export const asCodeResponseSchema = schema.object({
  id: schema.string({ maxLength: 1000 }),
  data: savedDataViewSpecSchema,
  meta: dataViewsMetaSchema,
});

export const asCodeMinimalResponseSchema = schema.object({
  id: schema.string({ maxLength: 1000 }),
  data: schema.object({
    name: savedDataViewSpecSchema.getPropSchemas().name,
    index_pattern: savedDataViewSpecSchema.getPropSchemas().index_pattern,
    time_field: savedDataViewSpecSchema.getPropSchemas().time_field,
  }),
  meta: dataViewsMetaSchema,
});

export const asCodePaginatedResponseSchema = schema.object({
  data: schema.arrayOf(asCodeMinimalResponseSchema, { maxSize: PAGINATION_MAX_SIZE }),
  meta: asCodePaginationResponseMetaSchema,
});

export const savedDataViewSpecSchemaWithoutId = savedDataViewSpecSchema.extends({
  id: schema.never(),
});
