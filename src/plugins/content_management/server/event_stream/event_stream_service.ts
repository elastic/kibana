/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { TimedItemBuffer } from '@kbn/bfetch-plugin/common';
import type {
  EventStreamClient,
  EventStreamClientFactory,
  EventStreamClientFilterOptions,
  EventStreamClientFilterResult,
  EventStreamEvent,
  EventStreamEventPartial,
  EventStreamLogger,
} from './types';
import { partialEventValidator } from './validation';

export interface EventStreamInitializerContext {
  logger: EventStreamLogger;
  clientFactory: EventStreamClientFactory;
}

export interface EventStreamSetup {
  core: CoreSetup;
}

export class EventStreamService {
  protected client?: EventStreamClient;
  readonly #buffer: TimedItemBuffer<EventStreamEvent>;

  constructor(private readonly ctx: EventStreamInitializerContext) {
    this.#buffer = new TimedItemBuffer<EventStreamEvent>({
      flushOnMaxItems: 100,
      maxItemAge: 250,
      onFlush: async (events: EventStreamEvent[]) => {
        const { logger } = this.ctx;

        if (!this.client) {
          logger.error('EventStreamClient is not initialized, events will not be written.');
          return;
        }

        try {
          await this.client.writeEvents(events);
        } catch (error) {
          logger.error('Failed to write events to Event Stream.');
          logger.error(error);
        }
      },
    });
  }

  /** Called during "setup" plugin life-cycle. */
  public setup({ core }: EventStreamSetup): void {
    this.client = this.ctx.clientFactory.create(core);
  }

  /** Called during "start" plugin life-cycle. */
  public start(): void {
    const { logger } = this.ctx;

    if (!this.client) throw new Error('EventStreamClient not initialized.');

    logger.debug('Initializing Event Stream.');
    this.client
      .initialize()
      .then(() => {
        logger.debug('Event Stream was initialized.');
      })
      .catch((error) => {
        logger.error('Failed to initialize Event Stream. Events will not be indexed.');
        logger.error(error);
      });
  }

  /** Called during "stop" plugin life-cycle. */
  public async stop(): Promise<void> {
    await this.#buffer.flushAsync();
  }

  #getClient(): EventStreamClient {
    if (!this.client) throw new Error('EventStreamClient not initialized.');
    return this.client;
  }

  /**
   * Validates a single event. Throws an error if the event is invalid.
   *
   * @param event A partial event to validate.
   */
  protected validatePartialEvent(event: EventStreamEventPartial): void {
    partialEventValidator(event);
    if (partialEventValidator.errors) {
      const error = partialEventValidator.errors[0];
      if (!error) throw new Error('Validation failed.');
      throw new Error(`Validation error at [path = ${error.instancePath}]: ${error.message}`);
    }
  }

  /**
   * Queues an event to be written to the Event Stream. The event is appended to
   * a buffer and written to the Event Stream periodically.
   *
   * Events are flushed once the buffer reaches 100 items or 250ms has passed,
   * whichever comes first. To force a flush, call `.flush()`.
   *
   * @param event Event to add to the Event Stream.
   */
  public addEvent(event: EventStreamEventPartial): void {
    this.validatePartialEvent(event);

    const completeEvent: EventStreamEvent = {
      ...event,
      time: event.time || Date.now(),
    };

    this.#buffer.write(completeEvent);
  }

  /**
   * Same as `.addEvent()` but accepts an array of events.
   *
   * @param events Events to add to the Event Stream.
   */
  public addEvents(events: EventStreamEventPartial[]): void {
    for (const event of events) {
      this.addEvent(event);
    }
  }

  /**
   * Flushes the event buffer, writing all events to the Event Stream.
   */
  public flush(): void {
    this.#buffer.flush();
  }

  /**
   * Read latest events from the Event Stream.
   *
   * @param limit Number of events to return. Defaults to 100.
   * @returns Latest events from the Event Stream.
   */
  public async tail(limit: number = 100): Promise<EventStreamEvent[]> {
    const client = this.#getClient();

    return await client.tail(limit);
  }

  /**
   * Retrieves events from the Event Stream which match the specified filter
   * options.
   *
   * @param options Filtering options.
   * @returns Paginated results of events matching the filter.
   */
  public async filter(
    options: EventStreamClientFilterOptions
  ): Promise<EventStreamClientFilterResult> {
    const client = this.#getClient();

    return await client.filter(options);
  }
}
