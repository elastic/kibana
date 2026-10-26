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
  /**
   * Delivered to each consumer as `JSON.parse(JSON.stringify(data))`, so `undefined` properties are
   * dropped. Use plain objects, arrays, strings, finite numbers, booleans and `null` only; in
   * development mode `publish` rejects anything else (`Date`, `Map`, class instances, `NaN`,
   * `undefined` array items, ...) and names the offending path, since in production it would be
   * delivered mangled.
   */
  readonly data: TData;
}

/**
 * Event accepted by the bus: the producer's event plus the fields the bus sets.
 * `data` is a JSON copy made for each consumer, never the producer's reference, so one handler
 * cannot affect another.
 *
 * @public
 */
export interface PubSubEvent<TData> extends PubSubEventInit<TData> {
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
  /** Name of this consumer within the plugin. Core scopes it so another plugin cannot take it. */
  readonly consumer: string;
  readonly handler: PubSubHandler<TData>;
}

/**
 * `TData` is inferred from the topic alone (`NoInfer` on the other argument). A name-only topic
 * (`Topic<never>`) cannot be published on or usefully subscribed to.
 *
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
   * Events published on the topic are queued for the consumer; delivery is best effort,
   * see {@link PubSubStart.publish} for the drop conditions.
   */
  subscribe<TData>(topic: Topic<TData>, subscription: PubSubSubscription<NoInfer<TData>>): void;
}

/**
 * @public
 */
export interface PubSubStart {
  /**
   * Accepts an event and returns once it is queued. Does not wait for handlers.
   *
   * Delivery is best effort and local to this Kibana node; a resolved promise means the event
   * was accepted, not that any consumer ran. A consumer's copy is dropped when that consumer
   * already has 1000 events pending. The overflow is logged once, then again with the drop count
   * when the queue drains. Events still queued when Kibana stops are discarded, and a publish
   * after stop resolves without queueing the event (logged at debug). Consumers on other nodes
   * never see the event.
   */
  publish<TData>(
    topic: Topic<TData>,
    event: PubSubEventInit<NoInfer<TData>>
  ): Promise<PubSubPublishResult>;
}
