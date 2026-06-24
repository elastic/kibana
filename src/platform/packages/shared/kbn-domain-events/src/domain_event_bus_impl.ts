/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitterAsyncResource } from 'node:events';
import type { DomainEvent, DomainEventBus } from './types';
import type { DomainEventType } from '../events';

const ASYNC_RESOURCE_NAME = 'DomainEventBus';
const ALL_EVENTS_CHANNEL = '__domain_event_bus_all__';

type DomainEventHandler = (event: DomainEvent) => void | Promise<void>;

export class DomainEventBusImpl implements DomainEventBus {
  readonly #emitter = new EventEmitterAsyncResource({
    captureRejections: true,
    name: ASYNC_RESOURCE_NAME,
  });

  constructor() {
    // Per Node's docs, emitting `'error'` with no listener crashes the process.
    this.#emitter.on('error', () => {});
  }

  public publish<T extends DomainEventType>(event: DomainEvent<T>): void {
    if (!event || typeof event.type !== 'string') {
      return;
    }

    this.#emitter.emit(ALL_EVENTS_CHANNEL, event);
  }

  public subscribeAll(handler: DomainEventHandler): () => void {
    const wrapped: DomainEventHandler = (event) => {
      setImmediate(async () => {
        try {
          await handler(event);
        } catch {
          // Handler failures are isolated; siblings continue running.
        }
      });
    };

    this.#emitter.on(ALL_EVENTS_CHANNEL, wrapped);

    let active = true;

    return () => {
      if (!active) {
        return;
      }

      active = false;
      this.#emitter.off(ALL_EVENTS_CHANNEL, wrapped);
    };
  }

  public subscribe<T extends DomainEventType>(
    type: T,
    handler: (event: DomainEvent<T>) => void | Promise<void>
  ): () => void {
    return this.subscribeAll((event) => {
      if (event.type !== type) {
        return;
      }

      return handler(event as DomainEvent<T>);
    });
  }
}