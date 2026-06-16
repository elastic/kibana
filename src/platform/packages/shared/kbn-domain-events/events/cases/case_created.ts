/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const CASE_CREATED_EVENT_TYPE = 'cases.caseCreated' as const;

export const caseCreatedPayloadSchema = z
  .object({
    caseId: z.string(),
    owner: z.string(),
    title: z.string(),
  })
  .strict();

export type CaseCreatedPayload = z.infer<typeof caseCreatedPayloadSchema>;

export const isCaseCreatedPayload = (value: unknown): value is CaseCreatedPayload =>
  caseCreatedPayloadSchema.safeParse(value).success;

export interface CaseCreatedDomainEventMap {
  [CASE_CREATED_EVENT_TYPE]: CaseCreatedPayload;
}
