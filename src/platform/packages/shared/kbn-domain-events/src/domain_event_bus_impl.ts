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

    this.#emitter.emit(event.type, event);
  }

  public subscribe<T extends DomainEventType>(
    type: T,
    handler: (event: DomainEvent<T>) => void | Promise<void>
  ): () => void {
    const wrapped: DomainEventHandler = (event) => {
      setImmediate(async () => {
        try {
          await handler(event as DomainEvent<T>);
        } catch {
          // Handler failures are isolated; siblings continue running.
        }
      });
    };

    this.#emitter.on(type, wrapped);

    // Unsubscribe is idempotent: calling it more than once removes the listener once.
    let active = true;

    return () => {
      if (!active) {
        return;
      }

      active = false;
      this.#emitter.off(type, wrapped);
    };
  }
}

/** One bus per Kibana Node process; all importers share this instance. */
export const domainEventBus = new DomainEventBusImpl();
