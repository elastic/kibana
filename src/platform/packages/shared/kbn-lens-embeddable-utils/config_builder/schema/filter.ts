/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const filterSchema = schema.object({
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
});

export const filterWithLabelSchema = schema.object({
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
});

export type LensApiFilterType = typeof filterSchema.type;

/**
 * Unified search filter schema that can accept either a full filter object or a simple query string.
 */
export const unifiedSearchFilterSchema = schema.object({
  query: schema.oneOf([
    schema.string(),
    schema.object({
      match_phrase: schema.maybe(schema.any({})),
      prefix: schema.maybe(schema.any({})),
      exists: schema.maybe(schema.any({})),
      match: schema.maybe(schema.any({})),
      wildcard: schema.maybe(schema.any({})),
      bool: schema.maybe(schema.any({})),
      range: schema.maybe(schema.any({})),
    }),
  ]),
  meta: schema.maybe(schema.object({})),
  language: schema.maybe(schema.oneOf([schema.literal('kuery'), schema.literal('lucene')])),
});

export type UnifiedSearchFilterType = typeof unifiedSearchFilterSchema.type;
