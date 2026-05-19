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
  asCodePaginationParamsSchema,
  asCodePaginationResponseMetaSchema,
  PAGINATION_MAX_SIZE,
} from '@kbn/as-code-shared-schemas';

export const searchRequestQuerySchema = z
  .object({
    query: z.string().optional().meta({
      description:
        'Filters results by `title` and `description` using Elasticsearch [`simple_query_string`](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-simple-query-string-query) syntax. Multi-word terms require all words to match.',
    }),
    ...asCodePaginationParamsSchema.shape,
  })
  .strict();

export const searchResponseBodySchema = z
  .object({
    data: z
      .array(
        z
          .object({
            id: z.string().meta({ description: 'The markdown library item ID.' }),
            data: z
              .object({
                description: z
                  .string()
                  .optional()
                  .meta({ description: 'The markdown library item description.' }),
                title: z.string().meta({ description: 'The markdown library item title.' }),
              })
              .strict(),
            meta: asCodeMetaSchema,
          })
          .strict()
      )
      .min(0)
      .max(PAGINATION_MAX_SIZE)
      .meta({ description: 'List of markdown library items matching the query.' }),
    meta: asCodePaginationResponseMetaSchema,
  })
  .strict();
