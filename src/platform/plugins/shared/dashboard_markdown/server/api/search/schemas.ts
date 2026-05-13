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

const MAX_PER_PAGE = 10000;

export const searchRequestQuerySchema = z.object({
  query: z.string().optional().meta({
    description:
      'An Elasticsearch simple_query_string query that filters markdown library items by "title" and "description"',
  }),
  page: z.coerce.number().optional().meta({
    description: 'The search page to return',
  }),
  per_page: z.coerce.number().max(MAX_PER_PAGE).optional().meta({
    description: 'The number of items to return per page',
  }),
});

export const searchResponseBodySchema = z.object({
  markdowns: z
    .array(
      z.object({
        id: z.string(),
        data: z.object({
          description: z.string().optional(),
          title: z.string(),
        }),
        meta: asCodeMetaSchema,
      })
    )
    .min(0)
    .max(MAX_PER_PAGE),
  total: z.number(),
  page: z.number(),
});
