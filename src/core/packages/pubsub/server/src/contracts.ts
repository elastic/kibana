/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Topic } from './topic';

/**
 * The event a producer writes.
 *
 * @public
 */
export interface PubSubEventInit<TData> {
  /**
   * Stable, source-derived id, unique within the topic. Reuse it when retrying the same delivery
   * so a durable bus can recognise the duplicate. Phase 1 does not deduplicate.
   */
  readonly id: string;
  readonly data: TData;
}

/**
 * Event accepted by the bus: the producer's event plus the fields the bus sets.
 * `data` is a JSON copy made for each consumer, never the producer's reference, so a `Date`
 * arrives as a string and one handler cannot affect another.
 *
 * @public
 */
export interface PubSubEvent<TData = unknown> extends PubSubEventInit<TData> {
  readonly topic: string;
  readonly acceptedAt: string;
}

/**
 * Handles one event for one consumer. A rejection is logged and the event is dropped for that consumer.
 * Handlers run with the consumer's own identity; the publisher's request is not forwarded.
 *
 * @public
 */
export type PubSubHandler<TData> = (event: PubSubEvent<TData>) => void | Promise<void>;

/**
 * What `publish` resolves with. `acceptedAt` is the bus clock at accept time.
 *
 * @public
 */
export interface PubSubPublishResult {
  readonly id: string;
  readonly acceptedAt: string;
}

/**
 * A named consumer of one topic.
 *
 * @public
 */
export interface PubSubSubscription<TData> {
  /** Plugin-local consumer name; core prefixes it with the plugin id. */
  readonly consumer: string;
  readonly handler: PubSubHandler<TData>;
}

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
   * Every event published on the topic is delivered to the consumer.
   */
  subscribe<TData>(topic: Topic<TData>, subscription: PubSubSubscription<TData>): void;
}

/**
 * @public
 */
export interface PubSubStart {
  /**
   * Accepts an event and returns once it is queued. Does not wait for handlers.
   */
  publish<TData>(topic: Topic<TData>, event: PubSubEventInit<TData>): Promise<PubSubPublishResult>;
}
