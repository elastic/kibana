/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { casesOwnerSchema } from './cases_owner';

export const CASE_STATUS_CHANGED_EVENT_TYPE = 'cases.caseStatusChanged' as const;

/** Matches `CaseStatusChangedEventPayload` in x-pack/platform/plugins/shared/cases/server/events/types.ts */
export const caseStatusChangedPayloadSchema = z
  .object({
    caseId: z.string(),
    owner: casesOwnerSchema,
    previousStatus: z.string(),
    status: z.string(),
  })
  .strict();

export type CaseStatusChangedPayload = z.infer<typeof caseStatusChangedPayloadSchema>;

export const isCaseStatusChangedPayload = (value: unknown): value is CaseStatusChangedPayload =>
  caseStatusChangedPayloadSchema.safeParse(value).success;

export interface CaseStatusChangedDomainEventMap {
  [CASE_STATUS_CHANGED_EVENT_TYPE]: CaseStatusChangedPayload;
}
