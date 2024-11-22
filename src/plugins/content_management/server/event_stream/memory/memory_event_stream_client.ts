/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EventStreamClient,
  EventStreamClientFilterOptions,
  EventStreamClientFilterResult,
  EventStreamEvent,
} from '../types';
import { clone } from './util';

/**
 * This is an in-memory implementation of the {@link EventStreamClient}
 * interface (it does not persist events to Elasticsearch). It is useful for
 * testing and demo purposes.
 */
export class MemoryEventStreamClient implements EventStreamClient {
  #events: EventStreamEvent[] = [];

  public async initialize(): Promise<void> {}

  public async writeEvents(events: EventStreamEvent[]): Promise<void> {
    for (const event of events) {
      this.#events.push(clone(event));
    }
    this.#events.sort((a, b) => b.time - a.time);
  }

  public async tail(limit: number = 100): Promise<EventStreamEvent[]> {
    const tail = this.#events.slice(0, limit);

    return tail.map(clone);
  }

  public async filter(
    options: EventStreamClientFilterOptions
  ): Promise<EventStreamClientFilterResult> {
    let events: EventStreamEvent[] = [...this.#events];

    const { subject, object, predicate, transaction, from, to } = options;

    if (subject && subject.length) {
      events = events.filter((event) => {
        if (!event.subject) {
          return false;
        }

        return subject.some(([type, id]) => {
          if (!id) return type === event.subject![0];
          return type === event.subject![0] && id === event.subject![1];
        });
      });
    }

    if (object && object.length) {
      events = events.filter((event) => {
        if (!event.object) {
          return false;
        }

        return object.some(([type, id]) => {
          if (!id) return type === event.object![0];
          return type === event.object![0] && id === event.object![1];
        });
      });
    }

    if (predicate && predicate.length) {
      events = events.filter((event) => {
        if (!event.predicate) {
          return false;
        }

        return predicate.some((type) => {
          if (type && type !== event.predicate![0]) {
            return false;
          }

          return true;
        });
      });
    }

    if (transaction && transaction.length) {
      events = events.filter((event) => {
        return !event.transaction ? false : transaction.some((id) => event.transaction === id);
      });
    }

    if (from) {
      events = events.filter((event) => event.time >= from);
    }

    if (to) {
      events = events.filter((event) => event.time <= to);
    }

    const size = options.limit ?? 100;
    const offset = options.cursor ? JSON.parse(options.cursor) : 0;

    events = events.slice(offset);

    if (events.length > size) {
      events = events.slice(0, size);
    }

    let cursor: string = '';

    if (events.length >= size) {
      cursor = JSON.stringify(offset + size);
    }

    return {
      cursor,
      events: events.map(clone),
    };
  }
}
