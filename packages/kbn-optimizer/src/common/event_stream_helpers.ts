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

import * as Rx from 'rxjs';

export interface Update<Event, State> {
  event?: Event;
  state: State;
}

export type EventInjector<Event> = (event: Event) => void;
export type Summarizer<Event, State> = (
  prev: State,
  event: Event,
  injectEvent: EventInjector<Event>
) => State | undefined;

/**
 * Transform an event stream into a state update stream which emits
 * the events and individual states for each event.
 */
export const summarizeEventStream = <Event, State>(
  event$: Rx.Observable<Event>,
  initialState: State,
  summarize: Summarizer<Event, State>
) => {
  return new Rx.Observable<Update<Event, State>>((subscriber) => {
    const eventBuffer: Event[] = [];

    let processingEventBuffer = false;
    let eventStreamComplete = false;
    let previousState = initialState;

    const injectEvent = (nextEvent: Event) => {
      eventBuffer.push(nextEvent);

      if (processingEventBuffer) {
        return;
      }

      try {
        processingEventBuffer = true;

        while (eventBuffer.length && !subscriber.closed) {
          const event = eventBuffer.shift()!;
          const nextState = summarize(previousState, event, injectEvent);

          if (nextState === undefined) {
            // skip this event
            continue;
          }

          // emit state update
          previousState = nextState;
          subscriber.next({
            event,
            state: nextState,
          });
        }

        if (eventStreamComplete) {
          subscriber.complete();
        }
      } catch (error) {
        subscriber.error(error);
      } finally {
        processingEventBuffer = false;
      }
    };

    // send initial "update"
    subscriber.next({
      state: initialState,
    });

    // inject all subsequent events to the internal eventBuffer
    subscriber.add(
      event$.subscribe(
        injectEvent,
        (error) => {
          subscriber.error(error);
        },
        () => {
          eventStreamComplete = true;
          if (!processingEventBuffer && eventBuffer.length === 0) {
            subscriber.complete();
          }
        }
      )
    );
  });
};
