/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { investigationResponseSchema } from './investigation';

const findInvestigationsParamsSchema = z
  .object({
    query: z
      .object({
        alertId: z.string(),
        search: z.string(),
        filter: z.string(),
        page: z.coerce.number(),
        perPage: z.coerce.number(),
      })
      .partial(),
  })
  .partial();

const findInvestigationsResponseSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
  results: z.array(investigationResponseSchema),
});

type FindInvestigationsParams = z.infer<typeof findInvestigationsParamsSchema.shape.query>;
type FindInvestigationsResponse = z.output<typeof findInvestigationsResponseSchema>;

export { findInvestigationsParamsSchema, findInvestigationsResponseSchema };
export type { FindInvestigationsParams, FindInvestigationsResponse };
