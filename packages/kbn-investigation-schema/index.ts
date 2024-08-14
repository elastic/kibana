/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { CreateInvestigationInput, CreateInvestigationResponse } from './src/schema/create';
export type {
  CreateInvestigationNoteInput,
  CreateInvestigationNoteResponse,
} from './src/schema/create_notes';
export type { FindInvestigationsParams, FindInvestigationsResponse } from './src/schema/find';
export type { GetInvestigationParams, GetInvestigationResponse } from './src/schema/get';
export type { GetInvestigationNotesResponse } from './src/schema/get_notes';

export {
  createInvestigationParamsSchema,
  createInvestigationResponseSchema,
} from './src/schema/create';
export {
  createInvestigationNoteParamsSchema,
  createInvestigationNoteResponseSchema,
} from './src/schema/create_notes';
export { deleteInvestigationParamsSchema } from './src/schema/delete';
export {
  findInvestigationsParamsSchema,
  findInvestigationsResponseSchema,
} from './src/schema/find';
export { getInvestigationParamsSchema, getInvestigationResponseSchema } from './src/schema/get';
export {
  getInvestigationNotesParamsSchema,
  getInvestigationNotesResponseSchema,
} from './src/schema/get_notes';
export { alertOriginSchema, blankOriginSchema } from './src/schema/origin';
