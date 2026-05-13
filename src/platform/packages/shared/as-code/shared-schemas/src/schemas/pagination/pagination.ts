/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const PAGINATION_DEFAULT_PER_PAGE = 20;
export const PAGINATION_MAX_SIZE = 1000;

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
    defaultValue: PAGINATION_DEFAULT_PER_PAGE,
    min: 1,
    max: PAGINATION_MAX_SIZE,
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
      defaultValue: PAGINATION_DEFAULT_PER_PAGE,
      min: 1,
      max: PAGINATION_MAX_SIZE,
    }),
    total: schema.number({
      meta: { description: 'The total number of results matching the query.' },
    }),
  },
  { unknowns: 'forbid' }
);
