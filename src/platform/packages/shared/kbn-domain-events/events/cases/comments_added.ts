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

export const COMMENTS_ADDED_EVENT_TYPE = 'cases.commentsAdded' as const;

export const commentsAddedPayloadSchema = z
  .object({
    caseId: z.string(),
    owner: casesOwnerSchema,
    commentIds: z.array(z.string()),
  })
  .strict();

export type CommentsAddedPayload = z.infer<typeof commentsAddedPayloadSchema>;

export const isCommentsAddedPayload = (value: unknown): value is CommentsAddedPayload =>
  commentsAddedPayloadSchema.safeParse(value).success;

export interface CommentsAddedDomainEventMap {
  [COMMENTS_ADDED_EVENT_TYPE]: CommentsAddedPayload;
}
