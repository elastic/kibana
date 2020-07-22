/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Embeddable } from '..';

/**
 * Below two interfaces are here temporarily, they will move to `ui_actions`
 * plugin once #58216 is merged.
 */
export interface SerializedEvent {
  eventId: string;
  triggerId: string;
  action: unknown;
}
export interface ActionStorage {
  create(event: SerializedEvent): Promise<void>;
  update(event: SerializedEvent): Promise<void>;
  remove(eventId: string): Promise<void>;
  read(eventId: string): Promise<SerializedEvent>;
  count(): Promise<number>;
  list(): Promise<SerializedEvent[]>;
}

export class EmbeddableActionStorage implements ActionStorage {
  constructor(private readonly embbeddable: Embeddable<any, any>) {}

  async create(event: SerializedEvent) {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as SerializedEvent[];
    const exists = !!events.find(({ eventId }) => eventId === event.eventId);

    if (exists) {
      throw new Error(
        `[EEXIST]: Event with [eventId = ${event.eventId}] already exists on ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.embbeddable.updateInput({
      ...input,
      events: [...events, event],
    });
  }

  async update(event: SerializedEvent) {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as SerializedEvent[];
    const index = events.findIndex(({ eventId }) => eventId === event.eventId);

    if (index === -1) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${event.eventId}] could not be ` +
          `updated as it does not exist in ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.embbeddable.updateInput({
      ...input,
      events: [...events.slice(0, index), event, ...events.slice(index + 1)],
    });
  }

  async remove(eventId: string) {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as SerializedEvent[];
    const index = events.findIndex((event) => eventId === event.eventId);

    if (index === -1) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${eventId}] could not be ` +
          `removed as it does not exist in ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.embbeddable.updateInput({
      ...input,
      events: [...events.slice(0, index), ...events.slice(index + 1)],
    });
  }

  async read(eventId: string): Promise<SerializedEvent> {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as SerializedEvent[];
    const event = events.find((ev) => eventId === ev.eventId);

    if (!event) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${eventId}] could not be found in ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    return event;
  }

  private __list() {
    const input = this.embbeddable.getInput();
    return (input.events || []) as SerializedEvent[];
  }

  async count(): Promise<number> {
    return this.__list().length;
  }

  async list(): Promise<SerializedEvent[]> {
    return this.__list();
  }
}
