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

import { SerializedAction } from './types';

/**
 * Serialized representation of event-action pair, used to persist in storage.
 */
export interface SerializedEvent {
  eventId: string;
  triggerId: string;
  action: SerializedAction<unknown>;
}

/**
 * This interface needs to be implemented by dynamic action users if they
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
}
