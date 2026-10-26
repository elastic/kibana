/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, displayName, description } from '@kbn/zod';
import {
  asCodeMetaSchema,
  asCodePaginationResponseMetaSchema,
  getAsCodeTagsSchema,
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
                description: description()
                  .optional()
                  .meta({ description: 'A short description of the Vega library item.' }),
                tags: getAsCodeTagsSchema(
                  'Tag IDs associated with this Vega library item.'
                ).optional(),
                title: displayName().meta({ description: 'The Vega library item title.' }),
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
