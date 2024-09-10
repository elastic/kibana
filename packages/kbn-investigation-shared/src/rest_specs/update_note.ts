/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { investigationNoteResponseSchema } from './investigation_note';

const updateInvestigationNoteParamsSchema = t.type({
  path: t.type({
    investigationId: t.string,
    noteId: t.string,
  }),
  body: t.type({
    content: t.string,
  }),
});

const updateInvestigationNoteResponseSchema = investigationNoteResponseSchema;

type UpdateInvestigationNoteParams = t.TypeOf<
  typeof updateInvestigationNoteParamsSchema.props.body
>;
type UpdateInvestigationNoteResponse = t.OutputOf<typeof updateInvestigationNoteResponseSchema>;

export { updateInvestigationNoteParamsSchema, updateInvestigationNoteResponseSchema };
export type { UpdateInvestigationNoteParams, UpdateInvestigationNoteResponse };
