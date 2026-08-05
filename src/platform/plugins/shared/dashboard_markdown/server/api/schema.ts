/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

import { markdownStateSchema } from '../embeddable/schemas';

export const markdownLibraryItemSchema = z
  .object({
    ...markdownStateSchema.shape,
    description: z
      .string()
      .optional()
      .meta({ description: 'A short description of the markdown library item.' }),
    title: z.string().min(1).meta({ description: 'The markdown library item title.' }),
  })
  .strict();
