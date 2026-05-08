/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const asCodePaginationParamsSchema = schema.object({
  page: schema.number({
    meta: {
      description: 'The page of results to return.',
    },
    min: 1,
    defaultValue: 1,
  }),
  per_page: schema.number({
    meta: {
      description: 'The number of results to return per page.',
    },
    defaultValue: 20,
    min: 1,
    max: 1000,
  }),
});

export const asCodePaginationResponseMetaSchema = schema.object(
  {
    page: schema.number({
      meta: {
        description: 'The page of results to return.',
      },
      min: 1,
      defaultValue: 1,
    }),
    per_page: schema.number({
      meta: {
        description: 'The number of results to return per page.',
      },
      defaultValue: 20,
      min: 1,
      max: 1000,
    }),
    total: schema.number({
      meta: { description: 'The total number of results matching the query.' },
    }),
  },
  { unknowns: 'forbid' }
);
