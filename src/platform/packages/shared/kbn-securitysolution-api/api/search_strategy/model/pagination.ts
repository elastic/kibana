/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export type PaginationInputPaginatedInput = z.input<typeof pagination>;

export const pagination = z
  .object({
    /** The activePage parameter defines the page of results you want to fetch */
    activePage: z.number(),
    /** The cursorStart parameter defines the start of the results to be displayed */
    cursorStart: z.number(),
    /** The fakePossibleCount parameter determines the total count in order to show 5 additional pages */
    fakePossibleCount: z.number(),
    /** The querySize parameter is the number of items to be returned */
    querySize: z.number(),
  })
  .default({
    activePage: 0,
    cursorStart: 0,
    fakePossibleCount: 0,
    querySize: 0,
  });
