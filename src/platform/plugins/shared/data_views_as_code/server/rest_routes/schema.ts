/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';
import { savedDataViewSpecSchema } from '@kbn/as-code-data-views-schema';
import {
  asCodeMetaSchema,
  asCodePaginationResponseMetaSchema,
  PAGINATION_MAX_SIZE,
} from '@kbn/as-code-shared-schemas';

const dataViewsMetaSchema = lazySchema(() =>
  asCodeMetaSchema.extend({
    namespaces: z.array(z.string().max(1000)).max(100).optional(),
  })
);

export const asCodeResponseSchema = lazySchema(() =>
  z
    .object({
      id: z.string().max(1000),
      data: savedDataViewSpecSchema,
      meta: dataViewsMetaSchema,
    })
    .strict()
);

export const asCodeMinimalResponseSchema = lazySchema(() =>
  z.object({
    id: z.string().max(1000),
    data: savedDataViewSpecSchema.pick({
      name: true,
      index_pattern: true,
      time_field: true,
    }),
    meta: dataViewsMetaSchema,
  })
);

export const asCodePaginatedResponseSchema = lazySchema(() =>
  z.object({
    data: z.array(asCodeMinimalResponseSchema).max(PAGINATION_MAX_SIZE),
    meta: asCodePaginationResponseMetaSchema,
  })
);

export const savedDataViewSpecSchemaWithoutId = lazySchema(() =>
  savedDataViewSpecSchema.omit({ id: true })
);
