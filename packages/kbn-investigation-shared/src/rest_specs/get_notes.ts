/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { investigationNoteResponseSchema } from './investigation_note';

const getInvestigationNotesParamsSchema = t.type({
  path: t.type({
    investigationId: t.string,
  }),
});

const getInvestigationNotesResponseSchema = t.array(investigationNoteResponseSchema);

type GetInvestigationNotesResponse = t.OutputOf<typeof getInvestigationNotesResponseSchema>;

export { getInvestigationNotesParamsSchema, getInvestigationNotesResponseSchema };
export type { GetInvestigationNotesResponse };
