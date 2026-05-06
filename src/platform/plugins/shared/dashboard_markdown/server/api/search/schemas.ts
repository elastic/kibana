/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';

const MAX_PER_PAGE = 10000;

export const searchRequestQuerySchema = schema.object({
  query: schema.maybe(
    schema.string({
      meta: {
        description:
          'Filters results by `title` and `description` using Elasticsearch [`simple_query_string`](https://www.elastic.co/docs/reference/query-languages/query-dsl/simple-query-string-query) syntax. Multi-word terms require all words to match.',
      },
    })
  ),
  page: schema.maybe(
    schema.number({
      meta: {
        description: 'The page of results to return. Defaults to `1`.',
      },
    })
  ),
  per_page: schema.maybe(
    schema.number({
      meta: {
        description: 'The number of results to return per page. Defaults to `20`.',
      },
    })
  ),
});

export const searchResponseBodySchema = schema.object({
  data: schema.arrayOf(
    schema.object({
      id: schema.string({ meta: { description: 'The markdown library item ID.' } }),
      data: schema.object({
        description: schema.maybe(
          schema.string({ meta: { description: 'The markdown library item description.' } })
        ),
        title: schema.string({ meta: { description: 'The markdown library item title.' } }),
      }),
      meta: asCodeMetaSchema,
    }),
    {
      meta: { description: 'The markdown library items matching the search query.' },
      minSize: 0,
      maxSize: MAX_PER_PAGE,
    }
  ),
  meta: schema.object({
    page: schema.number({
      meta: { description: 'The current page number.' },
    }),
    per_page: schema.number({
      meta: { description: 'The number of markdown library items returned in the current page.' },
    }),
    total: schema.number({
      meta: { description: 'The total number of markdown library items matching the query.' },
    }),
  }),
});
