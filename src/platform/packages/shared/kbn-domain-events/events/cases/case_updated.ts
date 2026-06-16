/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const CASE_UPDATED_EVENT_TYPE = 'cases.caseUpdated' as const;

export const caseUpdatedPayloadSchema = z
  .object({
    caseId: z.string(),
    updatedFields: z.record(z.string(), z.unknown()),
  })
  .strict();

export type CaseUpdatedPayload = z.infer<typeof caseUpdatedPayloadSchema>;

export const isCaseUpdatedPayload = (value: unknown): value is CaseUpdatedPayload =>
  caseUpdatedPayloadSchema.safeParse(value).success;

export interface CaseUpdatedDomainEventMap {
  [CASE_UPDATED_EVENT_TYPE]: CaseUpdatedPayload;
}
