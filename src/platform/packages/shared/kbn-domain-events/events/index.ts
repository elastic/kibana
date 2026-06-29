/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { CasesDomainEventMap } from './cases';
import type { WorkflowsDomainEventMap } from './workflows';
import { casesEventPayloadSchemas } from './cases';
import { workflowsEventPayloadSchemas } from './workflows';

export type DomainEventMap = CasesDomainEventMap & WorkflowsDomainEventMap;

export type DomainEventType = keyof DomainEventMap;

export type EventPayload<T extends DomainEventType> = DomainEventMap[T];

export const domainEventPayloadSchemas = {
  ...casesEventPayloadSchemas,
  ...workflowsEventPayloadSchemas,
} as const satisfies DomainEventPayloadSchemas;

type DomainEventPayloadSchemas = {
  [K in DomainEventType]: z.ZodType<DomainEventMap[K]>;
};
