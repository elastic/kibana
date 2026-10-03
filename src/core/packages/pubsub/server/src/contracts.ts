/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Topic } from './topic';

/**
 * Event accepted by the in-process bus.
 * `id` and `acceptedAt` are assigned by the bus. The payload is the caller's reference.
 *
 * @public
 */
export interface PubSubEvent<TPayload = unknown> {
  readonly id: string;
  readonly topic: string;
  readonly namespaces: readonly string[];
  readonly payload: TPayload;
  readonly acceptedAt: string;
}

/**
 * @public
 */
export interface PublishInput<TPayload> {
  readonly namespaces: readonly string[];
  readonly payload: TPayload;
}

/**
 * Caller identity for one delivery. Not part of the event.
 * Phase 1 forwards the publisher's KibanaRequest, shared by every handler of that delivery.
 * A durable phase fills the same field with a request rebuilt from stored credentials, which does not carry the original headers or symbols.
 *
 * @public
 */
export interface PubSubHandlerContext {
  readonly request?: KibanaRequest;
}

/**
 * @public
 */
export type PubSubHandler<TPayload> = (
  event: PubSubEvent<TPayload>,
  context: PubSubHandlerContext
) => void | Promise<void>;

/**
 * @public
 */
export interface PubSubSetup {
  /**
   * Registers a topic during plugin setup.
   * A second registration of the same name throws.
   */
  registerTopic<TPayload>(topic: Topic<TPayload>): void;

  /**
   * Subscribes during plugin setup.
   * `consumer` is the plugin-local name; the plugin facade prefixes it with the plugin id.
   * `namespaces` must be non-empty. `*` matches every namespace; otherwise the handler runs only when the sets intersect.
   */
  subscribe<TPayload>(
    topic: Topic<TPayload>,
    consumer: string,
    namespaces: readonly string[],
    handler: PubSubHandler<TPayload>
  ): void;
}

/**
 * @public
 */
export interface PubSubStart {
  /**
   * Accepts an event and returns once it is queued.
   * Does not wait for handlers. `context` is forwarded to handlers and is not stored on the event.
   */
  publish<TPayload>(
    topic: Topic<TPayload>,
    input: PublishInput<TPayload>,
    context?: PubSubHandlerContext
  ): Promise<PubSubEvent<TPayload>>;
}
