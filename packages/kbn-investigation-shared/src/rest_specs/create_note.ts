/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { investigationNoteResponseSchema } from './investigation_note';

const createInvestigationNoteParamsSchema = z.object({
  path: z.object({
    investigationId: z.string(),
  }),
  body: z.object({
    content: z.string(),
  }),
});

const createInvestigationNoteResponseSchema = investigationNoteResponseSchema;

type CreateInvestigationNoteParams = z.infer<typeof createInvestigationNoteParamsSchema.shape.body>;
type CreateInvestigationNoteResponse = z.output<typeof createInvestigationNoteResponseSchema>;

export { createInvestigationNoteParamsSchema, createInvestigationNoteResponseSchema };
export type { CreateInvestigationNoteParams, CreateInvestigationNoteResponse };
