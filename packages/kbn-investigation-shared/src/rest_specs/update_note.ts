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

const updateInvestigationNoteParamsSchema = z.object({
  path: z.object({
    investigationId: z.string(),
    noteId: z.string(),
  }),
  body: z.object({
    content: z.string(),
  }),
});

const updateInvestigationNoteResponseSchema = investigationNoteResponseSchema;

type UpdateInvestigationNoteParams = z.infer<typeof updateInvestigationNoteParamsSchema.shape.body>;
type UpdateInvestigationNoteResponse = z.output<typeof updateInvestigationNoteResponseSchema>;

export { updateInvestigationNoteParamsSchema, updateInvestigationNoteResponseSchema };
export type { UpdateInvestigationNoteParams, UpdateInvestigationNoteResponse };
