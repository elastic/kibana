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
