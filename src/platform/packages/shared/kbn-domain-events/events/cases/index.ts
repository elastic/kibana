/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import { CASE_CREATED_EVENT_TYPE, caseCreatedPayloadSchema } from './case_created';
import type { CaseCreatedDomainEventMap } from './case_created';
import { CASE_UPDATED_EVENT_TYPE, caseUpdatedPayloadSchema } from './case_updated';
import type { CaseUpdatedDomainEventMap } from './case_updated';
import {
  CASE_STATUS_CHANGED_EVENT_TYPE,
  caseStatusChangedPayloadSchema,
} from './case_status_changed';
import type { CaseStatusChangedDomainEventMap } from './case_status_changed';
import { ATTACHMENTS_ADDED_EVENT_TYPE, attachmentsAddedPayloadSchema } from './attachments_added';
import type { AttachmentsAddedDomainEventMap } from './attachments_added';
import { COMMENTS_ADDED_EVENT_TYPE, commentsAddedPayloadSchema } from './comments_added';
import type { CommentsAddedDomainEventMap } from './comments_added';

export type CasesDomainEventMap = CaseCreatedDomainEventMap &
  CaseUpdatedDomainEventMap &
  CaseStatusChangedDomainEventMap &
  AttachmentsAddedDomainEventMap &
  CommentsAddedDomainEventMap;

type CasesDomainEventMapSchemas = {
  [K in keyof CasesDomainEventMap]: z.ZodType<CasesDomainEventMap[K]>;
};

export { casesOwnerSchema } from './cases_owner';
export type { CasesOwner } from './cases_owner';
export {
  CASE_CREATED_EVENT_TYPE,
  caseCreatedPayloadSchema,
  isCaseCreatedPayload,
} from './case_created';
export type { CaseCreatedPayload } from './case_created';
export {
  CASE_UPDATED_EVENT_TYPE,
  caseUpdatedPayloadSchema,
  isCaseUpdatedPayload,
} from './case_updated';
export type { CaseUpdatedPayload } from './case_updated';
export {
  CASE_STATUS_CHANGED_EVENT_TYPE,
  caseStatusChangedPayloadSchema,
  isCaseStatusChangedPayload,
} from './case_status_changed';
export type { CaseStatusChangedPayload } from './case_status_changed';
export {
  ATTACHMENTS_ADDED_EVENT_TYPE,
  attachmentsAddedPayloadSchema,
  isAttachmentsAddedPayload,
} from './attachments_added';
export type { AttachmentsAddedPayload } from './attachments_added';
export {
  COMMENTS_ADDED_EVENT_TYPE,
  commentsAddedPayloadSchema,
  isCommentsAddedPayload,
} from './comments_added';
export type { CommentsAddedPayload } from './comments_added';

export const casesEventPayloadSchemas = {
  [CASE_CREATED_EVENT_TYPE]: caseCreatedPayloadSchema,
  [CASE_UPDATED_EVENT_TYPE]: caseUpdatedPayloadSchema,
  [CASE_STATUS_CHANGED_EVENT_TYPE]: caseStatusChangedPayloadSchema,
  [ATTACHMENTS_ADDED_EVENT_TYPE]: attachmentsAddedPayloadSchema,
  [COMMENTS_ADDED_EVENT_TYPE]: commentsAddedPayloadSchema,
} as const satisfies CasesDomainEventMapSchemas;
