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

/* eslint-disable max-classes-per-file */

import { Observable, Subject } from 'rxjs';
import { SerializedAction } from './types';

/**
 * Serialized representation of event-action pair, used to persist in storage.
 */
export interface SerializedEvent {
  eventId: string;
  triggers: string[];
  action: SerializedAction<unknown>;
}

/**
 * This CRUD interface needs to be implemented by dynamic action users if they
 * want to persist the dynamic actions. It has a default implementation in
 * Embeddables, however one can use the dynamic actions without Embeddables,
 * in that case they have to implement this interface.
 */
export interface ActionStorage {
  create(event: SerializedEvent): Promise<void>;
  update(event: SerializedEvent): Promise<void>;
  remove(eventId: string): Promise<void>;
  read(eventId: string): Promise<SerializedEvent>;
  count(): Promise<number>;
  list(): Promise<SerializedEvent[]>;

  /**
   * Triggered every time events changed in storage and should be re-loaded.
   */
  readonly reload$?: Observable<void>;
}

export abstract class AbstractActionStorage implements ActionStorage {
  public readonly reload$: Observable<void> & Pick<Subject<void>, 'next'> = new Subject<void>();

  public async count(): Promise<number> {
    return (await this.list()).length;
  }

  public async read(eventId: string): Promise<SerializedEvent> {
    const events = await this.list();
    const event = events.find(ev => ev.eventId === eventId);
    if (!event) throw new Error(`Event [eventId = ${eventId}] not found.`);
    return event;
  }

  abstract create(event: SerializedEvent): Promise<void>;
  abstract update(event: SerializedEvent): Promise<void>;
  abstract remove(eventId: string): Promise<void>;
  abstract list(): Promise<SerializedEvent[]>;
}

export class MemoryActionStorage extends AbstractActionStorage {
  constructor(public events: readonly SerializedEvent[] = []) {
    super();
  }

  public async list() {
    return this.events.map(event => ({ ...event }));
  }

  public async create(event: SerializedEvent) {
    this.events = [...this.events, { ...event }];
  }

  public async update(event: SerializedEvent) {
    const index = this.events.findIndex(({ eventId }) => eventId === event.eventId);
    if (index < 0) throw new Error('Event not found');
    this.events = [...this.events.slice(0, index), { ...event }, ...this.events.slice(index + 1)];
  }

  public async remove(eventId: string) {
    const index = this.events.findIndex(ev => eventId === ev.eventId);
    if (index < 0) throw new Error('Event not found');
    this.events = [...this.events.slice(0, index), ...this.events.slice(index + 1)];
  }
}
