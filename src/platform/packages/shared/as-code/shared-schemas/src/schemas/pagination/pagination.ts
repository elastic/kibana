/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { PAGINATION_DEFAULT_PER_PAGE, PAGINATION_MAX_SIZE } from '../../constants';

export const asCodePaginationParamsSchema = z
  .object({
    page: z.coerce.number().min(1).default(1).meta({
      description: 'The page of results to return.',
    }),
    per_page: z.coerce
      .number()
      .min(1)
      .max(PAGINATION_MAX_SIZE)
      .default(PAGINATION_DEFAULT_PER_PAGE)
      .meta({
        description: 'The number of results to return per page.',
      }),
  })
  .strict();

export const asCodePaginationResponseMetaSchema = z
  .object({
    page: z.number().min(1).default(1).meta({
      description: 'The returned page of results.',
    }),
    per_page: z.number().min(1).max(PAGINATION_MAX_SIZE).default(PAGINATION_DEFAULT_PER_PAGE).meta({
      description: 'The number of results returned per page.',
    }),
    total: z.number().meta({ description: 'The total number of results matching the query.' }),
  })
  .strict();
