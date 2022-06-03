/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject, Observable, mergeAll, map } from 'rxjs';

type EventStreamName = 'savedObjects';

export interface EventStream<T> {
  publish: (event: T) => void;
  stream$: Observable<T>;
}

function getIdGenerator() {
  let lastId = 0;

  return function getNextUniqueId() {
    lastId += 1;
    return lastId;
  };
}

const eventStreamsFactory = () => {
  const mainStream$$: Subject<Observable<any>> = new Subject();
  const combinedStream$ = mainStream$$.pipe(mergeAll());
  const subscriptions: {
    [stream in EventStreamName]?: {
      [eventType: string]: {
        [subId: string]: (data: any) => void;
      };
    };
  } = {};
  const getNextUniqueId = getIdGenerator();
  const eventStreams: Map<string, Subject<any>> = new Map();

  combinedStream$.subscribe((event: { stream: EventStreamName; type: string; data?: object }) => {
    const callbacks = subscriptions[event.stream]?.[event.type] ?? {};

    Object.values(callbacks).forEach((callback) => {
      callback(event.data);
    });
  });

  /**
   * Register a new event stream
   *
   * @param stream The stream name
   * @returns A "publish" method and an Observable for the stream
   */
  const registerEventStream = <T>(stream: EventStreamName): EventStream<T> => {
    if (eventStreams.has(stream)) {
      throw new Error(`Event stream [${stream}] is already registered.`);
    }

    const eventStream = new Subject<T>();
    eventStreams.set(stream, eventStream);

    mainStream$$.next(
      eventStream.asObservable().pipe(
        map((event) => ({
          stream, // We add the stream name to all the event
          ...event,
        }))
      )
    );

    return {
      publish: (event: T) => {
        eventStream.next(event);
      },
      stream$: eventStream.asObservable(),
    };
  };

  /**
   * Retrieve a stream Observable
   * @param stream The stream name
   * @returns An Observable to subscribe to
   */
  const getEventStream$ = <T>(stream: EventStreamName) => {
    const eventStream = eventStreams.get(stream);

    if (!eventStream) {
      return;
    }

    return (eventStream as Subject<T>).asObservable();
  };

  /**
   * Publish an event to a stream
   *
   * @param stream The stream to publish the event to
   * @param event The event to publish
   *
   * @example
   ```
  eventStreams.publish<SavedObjectEvents>('savedObjects', {
    type: 'pre:create',
    data: {
      baz: 123,
    },
  });
   ```
   */
  const publish = <T>(stream: EventStreamName, event: T) => {
    eventStreams.get(stream)?.next(event);
  };

  /**
   * Subscribe to a single event on an event stream
   *
   * @example
   * ```js
   eventStreams.subscribe<PreCreateEvent>('savedObjects', 'pre:create', (data) => {
     // Do something with data
   });
   * ```
   *
   * @param stream The stream name
   * @param eventType The event type
   * @param handler The handler to call with possible data
   * @returns Handler to unsubscribe from the stream event
   */
  const subscribe = <T extends { type: string; data?: unknown }>(
    stream: EventStreamName,
    eventType: T['type'],
    handler: (data: T['data']) => void
  ) => {
    if (!subscriptions[stream]) {
      subscriptions[stream] = {};
    }

    if (!subscriptions[stream]![eventType]) {
      subscriptions[stream]![eventType] = {};
    }

    const id = getNextUniqueId();

    subscriptions[stream]![eventType][id] = handler;

    return {
      unsubscribe: () => {
        delete subscriptions[stream]![eventType][id];
        if (Object.keys(subscriptions[stream]![eventType]).length === 0) {
          delete subscriptions[stream]![eventType];
        }
        if (Object.keys(subscriptions[stream]!).length === 0) {
          delete subscriptions[stream];
        }
      },
    };
  };

  return {
    registerEventStream,
    getEventStream$,
    publish,
    subscribe,
  };
};

const eventStreams = eventStreamsFactory();

export { eventStreams };
