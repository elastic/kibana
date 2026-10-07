/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  asCodeMetaSchema,
  asCodePaginationResponseMetaSchema,
  MAX_DESCRIPTION_LENGTH,
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  PAGINATION_MAX_SIZE,
} from '@kbn/as-code-shared-schemas';
import { z } from '@kbn/zod';

export const searchResponseBodySchema = z
  .object({
    data: z
      .array(
        z
          .object({
            id: z.string().max(MAX_ID_LENGTH),
            data: z
              .object({
                description: z
                  .string()
                  .max(MAX_DESCRIPTION_LENGTH)
                  .optional()
                  .meta({ description: 'A short description of the links library item.' }),
                title: z
                  .string()
                  .max(MAX_TITLE_LENGTH)
                  .meta({ description: 'The links library item title.' }),
              })
              .strict(),
            meta: asCodeMetaSchema,
          })
          .strict()
      )
      .min(0)
      .max(PAGINATION_MAX_SIZE)
      .meta({
        description: 'List of links library items matching the query.',
      }),
    meta: asCodePaginationResponseMetaSchema,
  })
  .strict();
