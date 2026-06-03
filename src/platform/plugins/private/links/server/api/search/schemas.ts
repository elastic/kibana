/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { asCodeMetaSchema, asCodePaginationResponseMetaSchema } from '@kbn/as-code-shared-schemas';

const MAX_PER_PAGE = 10000;

export const searchRequestQuerySchema = schema.object({
  query: schema.maybe(
    schema.string({
      meta: {
        description:
          'An Elasticsearch simple_query_string query that filters links library items by "title" and "description"',
      },
    })
  ),
  page: schema.maybe(
    schema.number({
      meta: {
        description: 'The search page to return',
      },
    })
  ),
  per_page: schema.maybe(
    schema.number({
      meta: {
        description: 'The number of items to return per page',
      },
      max: MAX_PER_PAGE,
    })
  ),
});

export const searchResponseBodySchema = schema.object({
  data: schema.arrayOf(
    schema.object({
      id: schema.string(),
      data: schema.object({
        description: schema.maybe(
          schema.string({
            meta: { description: 'A short description of the links library item.' },
          })
        ),
        title: schema.string({ meta: { description: 'The markdown library item title.' } }),
      }),
      meta: asCodeMetaSchema,
    }),
    {
      minSize: 0,
      maxSize: MAX_PER_PAGE,
      meta: {
        description: 'List of links library items matching the query.',
      },
    }
  ),
  meta: asCodePaginationResponseMetaSchema,
});
