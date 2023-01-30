/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import type { Subscription } from 'rxjs';

import type { ContentEvent, ContentEventType } from './event_types';

type EventListener = (arg: ContentEvent) => void;

export class EventBus {
  private _events$: Subject<ContentEvent>;
  private eventListeners = new Map<ContentEventType, { [contentType: string]: EventListener[] }>();
  private eventsSubscription: Subscription;

  constructor() {
    this._events$ = new Subject();

    this.eventsSubscription = this._events$.subscribe((event) => {
      const listeners = this.eventListeners.get(event.type);

      if (listeners && listeners[event.contentType]) {
        listeners[event.contentType].forEach((cb) => {
          cb(event);
        });
      }
    });
  }

  async on<ContentType extends string = string>(
    type: `${ContentType}.${ContentEventType}`,
    cb: EventListener
  ) {
    const [contentType, eventType] = type.split('.') as [ContentType, ContentEventType];

    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, {});
    }

    const eventTypeListeners = this.eventListeners.get(eventType)!;

    if (eventTypeListeners[contentType] === undefined) {
      eventTypeListeners[contentType] = [];
    }

    eventTypeListeners[contentType].push(cb);
  }

  emit(event: ContentEvent) {
    this._events$.next(event);
  }

  public get events$() {
    return this._events$.asObservable();
  }

  stop() {
    this.eventsSubscription.unsubscribe();
  }
}
