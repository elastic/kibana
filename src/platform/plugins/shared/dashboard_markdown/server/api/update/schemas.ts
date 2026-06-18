/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';
import { markdownLibraryItemSchema } from '../schema';

export const updateRequestBodySchema = markdownLibraryItemSchema;

export const updateResponseBodySchema = z
  .object({
    id: z.string(),
    data: markdownLibraryItemSchema,
    meta: asCodeMetaSchema,
  })
  .strict();
