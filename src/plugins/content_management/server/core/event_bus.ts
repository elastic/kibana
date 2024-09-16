/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  private eventListeners = new Map<
    ContentEventType,
    { [contentType: string]: Set<EventListener> }
  >();
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
          ...(eventListeners[event.contentTypeId] ?? []),
          ...(eventListeners[ALL_TYPES_KEY] ?? []),
        ];
        listeners.forEach((cb) => {
          cb(event);
        });
      }
    });
  }

  /**
   *
   *
   * @param type The event type e.g. "getItemSuccess")
   * @param cb Callback to execute
   *
   * @example
   *
   * ```ts
   * // Register an event for all content types
   * eventBus.on('getItemSuccess', (event) => {})
   *
   * // Register an event for the "dashboard" content type
   * * eventBus.on('getItemSuccess', 'dashboard', (event) => {})
   * ```
   */

  /**
   * Register an event listener for specific events on specific content types
   *
   * @param eventType The event type to listen to
   * @param contentType The content type to listen to (if not specified all content types will send the event type)
   * @param cb Handler to call when the event occurs
   *
   * @returns Handler to unsubscribe
   */
  on(eventType: ContentEventType, cb: EventListener): () => void;
  on<ContentType extends string = string>(
    eventType: ContentEventType,
    contentType: ContentType,
    cb: EventListener
  ): () => void;
  on<ContentType extends string = string>(
    eventType: ContentEventType,
    _contentType: ContentType | EventListener,
    _cb?: EventListener
  ): () => void {
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
      eventTypeListeners[contentType] = new Set();
    }

    eventTypeListeners[contentType].add(cb);

    return () => {
      eventTypeListeners[contentType].delete(cb);
    };
  }

  /**
   * Send an event to the CM event bus
   * @param event The event to send
   */
  emit(event: ContentEvent) {
    this._events$.next(event);
  }

  /** Content management events Observable */
  public get events$() {
    return this._events$.asObservable();
  }

  stop() {
    this.eventsSubscription.unsubscribe();
  }
}
