/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DomainEvent, DomainEventType } from '@kbn/domain-events';

/**
 * Setup contract for the domain events service.
 *
 * Subscriptions must be registered during the plugin `setup` lifecycle so that
 * handlers are in place before any events are published at `start`/runtime.
 *
 * @public
 */
export interface DomainEventsServiceSetup {
  /**
   * Subscribe to a single domain event type.
   */
  subscribe<T extends DomainEventType>(
    type: T,
    handler: (event: DomainEvent<T>) => void | Promise<void>
  ): void;
  /**
   * Subscribe to every event published on the bus.
   */
  subscribeAll(handler: (event: DomainEvent) => void | Promise<void>): void;
}

/**
 * Start contract for the domain events service.
 *
 * @public
 */
export interface DomainEventsServiceStart {
  /**
   * Publish a domain event. Returns immediately; handlers run asynchronously
   * and their failures are isolated from the publisher.
   */
  publish<T extends DomainEventType>(event: DomainEvent<T>): void;
}
