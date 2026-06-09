/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type Type, type TypeOf } from '@kbn/config-schema';
import { asCodePaginationParamsSchema } from '../pagination';

type PaginationParamsSchema = ReturnType<typeof asCodePaginationParamsSchema.getPropSchemas>;
type PartialPaginationParamsSchema = {
  [K in keyof PaginationParamsSchema]: Type<TypeOf<PaginationParamsSchema[K]> | undefined>;
};

export const asCodeSearchRequestQuerySchema = schema.object({
  query: schema.maybe(
    schema.string({
      maxLength: 500,
      meta: {
        description:
          'Filters results by `title` and `description` using Elasticsearch [`simple_query_string`](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-simple-query-string-query) syntax. Multi-word terms require all words to match.',
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
