/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const filterSchema = schema.object(
  {
    language: schema.oneOf([schema.literal('kuery'), schema.literal('lucene')], {
      defaultValue: 'kuery',
    }),
    /**
     * Filter query
     */
    query: schema.string({
      meta: {
        description: 'Filter query',
      },
    }),
  },
  { meta: { id: 'filterSimpleSchema' } }
);

export const filterWithLabelSchema = schema.object(
  {
    /**
     * Filter query
     */
    filter: filterSchema,
    /**
     * Label for the filter
     */
    label: schema.maybe(
      schema.string({
        meta: {
          description: 'Label for the filter',
        },
      })
    ),
  },
  { meta: { id: 'filterWithLabelSchema' } }
);

export type LensApiFilterType = typeof filterSchema.type;

const FilterQueryType = schema.object(
  {
    match_phrase: schema.maybe(schema.any({})),
    prefix: schema.maybe(schema.any({})),
    exists: schema.maybe(schema.any({})),
    match: schema.maybe(schema.any({})),
    wildcard: schema.maybe(schema.any({})),
    bool: schema.maybe(schema.any({})),
    range: schema.maybe(schema.any({})),
    terms: schema.maybe(schema.any({})),
  },
  { meta: { id: 'filterQueryTypeSchema' } }
);

/**
 * Unified search filter schema that can accept either a full filter object or a simple query string.
 */
export const unifiedSearchFilterSchema = schema.oneOf(
  [
    schema.object({
      query: schema.oneOf([schema.string(), FilterQueryType]),
      meta: schema.maybe(schema.object({})),
      language: schema.maybe(schema.oneOf([schema.literal('kuery'), schema.literal('lucene')])),
    }),
    FilterQueryType.extends({
      meta: schema.maybe(schema.object({})),
      language: schema.maybe(schema.oneOf([schema.literal('kuery'), schema.literal('lucene')])),
    }),
  ],
  { meta: { id: 'searchFilterSchema' } }
);

export type UnifiedSearchFilterType = TypeOf<typeof unifiedSearchFilterSchema>;
