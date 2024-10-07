/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
