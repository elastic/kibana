/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { savedDataViewSpecSchema } from '@kbn/as-code-data-views-schema';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';

export const asCodeResponseSchema = z
  .object({
    id: z.string().max(1000),
    data: savedDataViewSpecSchema,
    meta: asCodeMetaSchema.extend({
      namespaces: z.array(z.string().max(1000)).max(100).optional(),
    }),
  })
  .strict();
