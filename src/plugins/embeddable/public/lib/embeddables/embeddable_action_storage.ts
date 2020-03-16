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

import {
  UiActionsAbstractActionStorage,
  UiActionsSerializedEvent,
} from '../../../../ui_actions/public';
import { Embeddable } from '..';

export class EmbeddableActionStorage extends UiActionsAbstractActionStorage {
  constructor(private readonly embbeddable: Embeddable<any, any>) {
    super();
  }

  async create(event: UiActionsSerializedEvent) {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as UiActionsSerializedEvent[];
    const exists = !!events.find(({ eventId }) => eventId === event.eventId);

    if (exists) {
      throw new Error(
        `[EEXIST]: Event with [eventId = ${event.eventId}] already exists on ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.embbeddable.updateInput({
      events: [...events, event],
    });
  }

  async update(event: UiActionsSerializedEvent) {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as UiActionsSerializedEvent[];
    const index = events.findIndex(({ eventId }) => eventId === event.eventId);

    if (index === -1) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${event.eventId}] could not be ` +
          `updated as it does not exist in ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.embbeddable.updateInput({
      events: [...events.slice(0, index), event, ...events.slice(index + 1)],
    });
  }

  async remove(eventId: string) {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as UiActionsSerializedEvent[];
    const index = events.findIndex(event => eventId === event.eventId);

    if (index === -1) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${eventId}] could not be ` +
          `removed as it does not exist in ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.embbeddable.updateInput({
      events: [...events.slice(0, index), ...events.slice(index + 1)],
    });
  }

  async read(eventId: string): Promise<UiActionsSerializedEvent> {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as UiActionsSerializedEvent[];
    const event = events.find(ev => eventId === ev.eventId);

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
    return (input.events || []) as UiActionsSerializedEvent[];
  }

  async list(): Promise<UiActionsSerializedEvent[]> {
    return this.__list();
  }
}
