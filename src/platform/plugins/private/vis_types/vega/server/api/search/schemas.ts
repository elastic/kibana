/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import {
  asCodeMetaSchema,
  asCodePaginationResponseMetaSchema,
  getAsCodeTagsSchema,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  PAGINATION_MAX_SIZE,
} from '@kbn/as-code-shared-schemas';

export const searchResponseBodySchema = z
  .object({
    data: z
      .array(
        z
          .object({
            id: z.string().meta({ description: 'The Vega library item ID.' }),
            data: z
              .object({
                description: z
                  .string()
                  .max(MAX_DESCRIPTION_LENGTH)
                  .optional()
                  .meta({ description: 'A short description of the Vega library item.' }),
                tags: getAsCodeTagsSchema(
                  'Tag IDs associated with this Vega library item.'
                ).optional(),
                title: z
                  .string()
                  .max(MAX_TITLE_LENGTH)
                  .meta({ description: 'The Vega library item title.' }),
              })
              .strict(),
            meta: asCodeMetaSchema,
          })
          .strict()
      )
      .min(0)
      .max(PAGINATION_MAX_SIZE)
      .meta({ description: 'List of Vega library items matching the query.' }),
    meta: asCodePaginationResponseMetaSchema,
  })
  .strict();
