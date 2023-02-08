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

/** Key used to represent all content types */
const ALL_TYPES_KEY = '*';

/**
 * Content event listener
 */
export type EventListener = (arg: ContentEvent) => void;

/**
 * Event bus for all content generated events
 */
export class EventBus {
  /** The events Rxjs Subject */
  private _events$: Subject<ContentEvent>;
  /** Map of listener for each content type */
  private eventListeners = new Map<ContentEventType, { [contentType: string]: EventListener[] }>();
  /** Subscription to the _events$ Observable */
  private eventsSubscription: Subscription;

  /**
   * @param contentTypeValidator Handler to validate if a content type is valid or not
   */
  constructor(private contentTypeValidator?: (contentType: string) => boolean) {
    this._events$ = new Subject();
    this.eventsSubscription = this._events$.subscribe((event) => {
      const eventListeners = this.eventListeners.get(event.type);

      if (eventListeners) {
        const listeners = [
          ...(eventListeners[event.contentType] ?? []),
          ...(eventListeners[ALL_TYPES_KEY] ?? []),
        ];
        listeners.forEach((cb) => {
          cb(event);
        });
      }
    });
  }

  /**
   * Register an event listener for specific events on specific content types
   * @param type The event type (<contentType>.<eventType>. e.g. "dashboard.getItemSuccess")
   * @param cb Callback to execute
   *
   * @example
   *
   * ```ts
   * eventBus.on('getItemSuccess', (event) => {})
   * ```
   */
  async on(type: ContentEventType, cb: EventListener): Promise<void>;
  async on<ContentType extends string = string>(
    type: ContentEventType,
    contentType: ContentType,
    cb: EventListener
  ): Promise<void>;
  async on<ContentType extends string = string>(
    eventType: ContentEventType,
    _contentType: ContentType | EventListener,
    _cb?: EventListener
  ) {
    const contentType = typeof _contentType === 'function' ? ALL_TYPES_KEY : _contentType;
    const cb = typeof _contentType === 'function' ? _contentType : _cb!;

    if (contentType !== ALL_TYPES_KEY) {
      const isContentTypeValid = this.contentTypeValidator?.(contentType) ?? true;
      if (!isContentTypeValid) {
        throw new Error(`Invalid content type [${contentType}].`);
      }
    }

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
