/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitterAsyncResource } from 'node:events';
import type { Logger } from '@kbn/logging';
import type { DomainEvent, DomainEventBus } from './types';
import type { DomainEventType } from '../events';

const ASYNC_RESOURCE_NAME = 'DomainEventBus';

type DomainEventHandler = (event: DomainEvent) => void | Promise<void>;

type DomainEventBusErrorCode =
  | 'DOMAIN_EVENT_BUS_HANDLER_FAILURE'
  | 'DOMAIN_EVENT_BUS_EMITTER_ERROR';

interface DomainEventBusErrorContext {
  readonly code: DomainEventBusErrorCode;
  readonly scope: string;
}

const RESERVED_EVENT_TYPES: ReadonlySet<string> = new Set([
  'error',
  'newListener',
  'removeListener',
]);

const createFallbackLogger = (): Logger => {
  const noop = () => {};
  const logger: Logger = {
    trace: noop,
    debug: noop,
    info: noop,
    warn: (errorOrMessage) => {
      const message =
        typeof errorOrMessage === 'function'
          ? errorOrMessage()
          : errorOrMessage instanceof Error
          ? errorOrMessage.message
          : errorOrMessage;
      // eslint-disable-next-line no-console
      console.warn(`[domain-events] ${message}`);
    },
    error: (errorOrMessage, meta) => {
      const error =
        errorOrMessage instanceof Error
          ? errorOrMessage
          : new Error(
              typeof errorOrMessage === 'function' ? errorOrMessage() : String(errorOrMessage)
            );
      // eslint-disable-next-line no-console
      console.error(`[domain-events] ${error.message}`, meta);
    },
    fatal: noop,
    log: noop,
    isLevelEnabled: () => true,
    get: () => logger,
  };

  return logger;
};

let defaultLogger: Logger | undefined;

const getDefaultLogger = (): Logger => {
  if (!defaultLogger) {
    defaultLogger = createFallbackLogger();
  }

  return defaultLogger;
};

export class DomainEventBusImpl implements DomainEventBus {
  readonly #emitter = new EventEmitterAsyncResource({
    captureRejections: true,
    name: ASYNC_RESOURCE_NAME,
  });

  constructor(private readonly logger: Logger = getDefaultLogger()) {
    this.#emitter.on('error', (err) =>
      this.#logError(err, { code: 'DOMAIN_EVENT_BUS_EMITTER_ERROR', scope: 'internal' })
    );
  }

  public publish<T extends DomainEventType>(event: DomainEvent<T>): void {
    if (!event || typeof event.type !== 'string') {
      this.logger.debug(
        () => '[domain-events] Refused to publish event without a string `type` discriminator.'
      );

      return;
    }

    if (RESERVED_EVENT_TYPES.has(event.type)) {
      this.logger.warn(
        () =>
          `[domain-events] Refused to publish event with reserved \`type\` "${event.type}". ` +
          `These names are reserved by Node's EventEmitter.`
      );

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
        } catch (err) {
          this.#logError(err, { code: 'DOMAIN_EVENT_BUS_HANDLER_FAILURE', scope: event.type });
        }
      });
    };

    this.#emitter.on(type, wrapped);

    let active = true;

    return () => {
      if (!active) {
        return;
      }

      active = false;
      this.#emitter.off(type, wrapped);
    };
  }

  #logError(err: unknown, { code, scope }: DomainEventBusErrorContext): void {
    const error = err instanceof Error ? err : new Error(String(err));
    this.logger.error(error, {
      error,
      code,
      type: `DomainEventBus:${scope}`,
    });
  }
}

/** One bus per Kibana Node process; all importers share this instance. */
export const domainEventBus = new DomainEventBusImpl();
