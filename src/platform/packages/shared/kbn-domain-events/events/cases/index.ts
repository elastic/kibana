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

export type CasesDomainEventMap = CaseCreatedDomainEventMap & CaseUpdatedDomainEventMap;

type CasesDomainEventMapSchemas = {
  [K in keyof CasesDomainEventMap]: z.ZodType<CasesDomainEventMap[K]>;
};

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

export const casesEventPayloadSchemas = {
  [CASE_CREATED_EVENT_TYPE]: caseCreatedPayloadSchema,
  [CASE_UPDATED_EVENT_TYPE]: caseUpdatedPayloadSchema,
} as const satisfies CasesDomainEventMapSchemas;
