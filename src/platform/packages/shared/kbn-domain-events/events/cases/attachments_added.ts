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

export const ATTACHMENTS_ADDED_EVENT_TYPE = 'cases.attachmentsAdded' as const;

/** Matches `AttachmentsAddedEventPayload` in x-pack/platform/plugins/shared/cases/server/events/types.ts */
export const attachmentsAddedPayloadSchema = z
  .object({
    caseId: z.string(),
    owner: casesOwnerSchema,
    attachmentIds: z.array(z.string()),
    attachmentType: z.string(),
  })
  .strict();

export type AttachmentsAddedPayload = z.infer<typeof attachmentsAddedPayloadSchema>;

export const isAttachmentsAddedPayload = (value: unknown): value is AttachmentsAddedPayload =>
  attachmentsAddedPayloadSchema.safeParse(value).success;

export interface AttachmentsAddedDomainEventMap {
  [ATTACHMENTS_ADDED_EVENT_TYPE]: AttachmentsAddedPayload;
}
