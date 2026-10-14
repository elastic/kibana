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
 * `id` and `acceptedAt` are assigned by the bus. `data` is the caller's reference.
 *
 * @public
 */
export interface PubSubEvent<TData = unknown> {
  readonly id: string;
  readonly topic: string;
  readonly data: TData;
  readonly acceptedAt: string;
}

/**
 * @public
 */
export interface PublishInput<TData> {
  readonly data: TData;
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
export type PubSubHandler<TData> = (
  event: PubSubEvent<TData>,
  context: PubSubHandlerContext
) => void | Promise<void>;

/**
 * @public
 */
export interface PubSubSetup {
  /**
   * Registers a topic during plugin setup.
   * Topic names are unique across Kibana; a second registration of the same name throws.
   */
  registerTopic<TData>(topic: Topic<TData>): void;

  /**
   * Subscribes during plugin setup.
   * `consumer` is the plugin-local name; core prefixes it with the plugin id.
   * Every event published on the topic is delivered to the consumer.
   */
  subscribe<TData>(topic: Topic<TData>, consumer: string, handler: PubSubHandler<TData>): void;
}

/**
 * @public
 */
export interface PubSubStart {
  /**
   * Accepts an event and returns once it is queued.
   * Does not wait for handlers. `context` is forwarded to handlers and is not stored on the event.
   */
  publish<TData>(
    topic: Topic<TData>,
    input: PublishInput<TData>,
    context?: PubSubHandlerContext
  ): Promise<PubSubEvent<TData>>;
}
