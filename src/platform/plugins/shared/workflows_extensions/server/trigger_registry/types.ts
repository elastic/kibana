/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DomainEvent } from '@kbn/domain-events';
import type { DomainEventType } from '@kbn/domain-events/events';
import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '../../common';

export interface ServerTriggerDefinition<
  EventSchema extends z.ZodType = z.ZodType,
  TDomainEventType extends DomainEventType = DomainEventType,
> extends CommonTriggerDefinition<EventSchema> {
  /** Bus event type this trigger listens to. Omit for emitEvent-only triggers. */
  domainEventType?: TDomainEventType;
  /** When omitted, all events of {@link domainEventType} are candidates. */
  shouldHandleDomainEvent?: (event: DomainEvent) => boolean;
  /** When omitted, trigger payload defaults to event.payload. */
  mapEvent?: (event: DomainEvent) => z.infer<EventSchema>;
}

/**
 * Defines a server trigger with {@link domainEventType} narrowing for bus handlers.
 *
 * Prefer this over annotating `ServerTriggerDefinition` directly so `event.payload`
 * is inferred from the `domainEventType` literal.
 */
export function createServerTriggerDefinition<
  const TDomainEventType extends DomainEventType,
  EventSchema extends z.ZodType,
>(
  definition: CommonTriggerDefinition<EventSchema> & {
    domainEventType: TDomainEventType;
    shouldHandleDomainEvent?: (event: DomainEvent<TDomainEventType>) => boolean;
    mapEvent?: (event: DomainEvent<TDomainEventType>) => z.infer<EventSchema>;
  }
): ServerTriggerDefinition<EventSchema, TDomainEventType> {
  return definition as ServerTriggerDefinition<EventSchema, TDomainEventType>;
}
