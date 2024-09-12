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
import { statusSchema } from '../schema';

const updateInvestigationParamsSchema = z.object({
  path: z.object({
    investigationId: z.string(),
  }),
  body: z
    .object({
      title: z.string(),
      status: z.union([z.literal('ongoing'), z.literal('closed')]),
      params: z.object({
        timeRange: z.object({ from: z.number(), to: z.number() }),
      }),
      tags: z.array(z.string()),
    })
    .partial(),
});

const updateInvestigationResponseSchema = investigationResponseSchema;

type UpdateInvestigationParams = z.infer<typeof updateInvestigationParamsSchema.shape.body>;
type UpdateInvestigationResponse = z.output<typeof updateInvestigationResponseSchema>;

export { updateInvestigationParamsSchema, updateInvestigationResponseSchema };
export type { UpdateInvestigationParams, UpdateInvestigationResponse };
