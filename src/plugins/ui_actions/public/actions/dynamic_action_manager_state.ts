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

import { SerializedEvent } from './dynamic_action_storage';

/**
 * This interface represents the state of @type {DynamicActionManager} at any
 * point in time.
 */
export interface State {
  /**
   * Whether dynamic action manager is currently in process of fetching events
   * from storage.
   */
  readonly isFetchingEvents: boolean;

  /**
   * Number of times event fetching has been completed.
   */
  readonly fetchCount: number;

  /**
   * List of all fetched events. If `null`, means now events have been loaded yet.
   */
  readonly events: readonly SerializedEvent[];
}

export interface Transitions {
  startFetching: (state: State) => () => State;
  finishFetching: (state: State) => (events: SerializedEvent[]) => State;
  addEvent: (state: State) => (event: SerializedEvent) => State;
  removeEvent: (state: State) => (eventId: string) => State;
  replaceEvent: (state: State) => (event: SerializedEvent) => State;
}

export interface Selectors {
  getEvent: (state: State) => (eventId: string) => SerializedEvent | null;
}

export const defaultState: State = {
  isFetchingEvents: false,
  fetchCount: 0,
  events: [],
};

export const transitions: Transitions = {
  startFetching: state => () => ({ ...state, isFetchingEvents: true }),

  finishFetching: state => events => ({
    ...state,
    isFetchingEvents: false,
    fetchCount: state.fetchCount + 1,
    events,
  }),

  addEvent: state => (event: SerializedEvent) => ({
    ...state,
    events: [...(state.events || []), event],
  }),

  removeEvent: state => (eventId: string) => ({
    ...state,
    events: state.events ? state.events.filter(event => event.eventId !== eventId) : state.events,
  }),

  replaceEvent: state => event => {
    const index = state.events.findIndex(({ eventId }) => eventId === event.eventId);
    if (index === -1) return state;

    return {
      ...state,
      events: [...state.events.slice(0, index), event, ...state.events.slice(index + 1)],
    };
  },
};

export const selectors: Selectors = {
  getEvent: state => eventId => state.events.find(event => event.eventId === eventId) || null,
};
