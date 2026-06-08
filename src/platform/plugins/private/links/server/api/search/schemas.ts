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
  asCodePaginationParamsSchema,
  asCodePaginationResponseMetaSchema,
  PAGINATION_MAX_SIZE,
} from '@kbn/as-code-shared-schemas';
import { schema, type Type, type TypeOf } from '@kbn/config-schema';

type PaginationParamsSchema = ReturnType<typeof asCodePaginationParamsSchema.getPropSchemas>;
type PartialPaginationParamsSchema = {
  [K in keyof PaginationParamsSchema]: Type<TypeOf<PaginationParamsSchema[K]> | undefined>;
};

export const searchRequestQuerySchema = schema.object({
  query: schema.maybe(
    schema.string({
      meta: {
        description:
          'Filters results by `name` and `description` using Elasticsearch [`simple_query_string`](https://www.elastic.co/docs/reference/query-languages/query-dsl/simple-query-string-query) syntax. Multi-word terms require all words to match.',
      },
    })
  ),
  ...(Object.entries(asCodePaginationParamsSchema.getPropSchemas()).reduce(
    (prev, [key, prop]) => ({
      ...prev,
      [key]: schema.maybe(prop),
    }),
    {}
  ) as PartialPaginationParamsSchema),
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
        title: schema.string({ meta: { description: 'The links library item title.' } }),
      }),
      meta: asCodeMetaSchema,
    }),
    {
      minSize: 0,
      maxSize: PAGINATION_MAX_SIZE,
      meta: {
        description: 'List of links library items matching the query.',
      },
    }
  ),
  meta: asCodePaginationResponseMetaSchema,
});
