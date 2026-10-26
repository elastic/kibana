/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import {
  assertTopicName,
  type PubSubEvent,
  type PubSubEventInit,
  type PubSubPublishResult,
  type PubSubSubscription,
  type Topic,
} from '@kbn/core-pubsub-server';
import { scopeConsumerName } from './consumer_name';
import { findJsonRoundTripMismatch } from './json_round_trip';
import type { InternalPubSubSetup, InternalPubSubStart } from './internal_contracts';

type Phase = 'created' | 'setup' | 'started' | 'stopped';

type SubscriptionHandler = (event: PubSubEvent<unknown>) => void | Promise<void>;

/** An accepted event as queued: the data stays serialized until each consumer gets its own copy. */
interface AcceptedEvent {
  readonly id: string;
  readonly topic: string;
  readonly acceptedAt: string;
  readonly serializedData: string;
}

interface Subscription {
  readonly topic: string;
  /** Full consumer name, `${pluginId}.${consumer}`. */
  readonly consumer: string;
  readonly handler: SubscriptionHandler;
  readonly queue: AcceptedEvent[];
  running: boolean;
  /** Events dropped since this queue last drained, while it was at the cap. */
  droppedWhileFull: number;
}

/** Pending events per consumer, not counting the one already in flight. */
export const PUBSUB_MAX_PENDING_EVENTS = 1000;

/** UTF-8 byte size of `JSON.stringify(data)`. */
export const PUBSUB_MAX_DATA_BYTES = 256 * 1024;

/** Characters in a producer-supplied event id. */
export const PUBSUB_MAX_ID_LENGTH = 256;

/** @internal */
export class PubSubService implements CoreService<InternalPubSubSetup, InternalPubSubStart> {
  private readonly logger: Logger;
  /** Topic name to the plugin that registered it. Kept for diagnostics; it does not restrict publishing. */
  private readonly topics = new Map<string, string>();
  private readonly subscriptions: Subscription[] = [];
  /** In dev mode, data that does not survive the JSON round trip is rejected instead of delivered mangled. */
  private readonly checkJsonRoundTrip: boolean;
  private phase: Phase = 'created';

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('pubsub');
    this.checkJsonRoundTrip = coreContext.env.mode.dev;
  }

  public setup(): InternalPubSubSetup {
    if (this.phase !== 'created') {
      throw new Error('Pubsub setup can only be called once.');
    }

    this.phase = 'setup';
    this.logger.debug('Setting up pubsub service');

    return {
      registerTopic: (pluginId, topic) => {
        this.registerTopic(pluginId, topic);
      },
      subscribe: (pluginId, topic, subscription) => {
        this.subscribe(pluginId, topic, subscription);
      },
    };
  }

  public start(): InternalPubSubStart {
    if (this.phase !== 'setup') {
      throw new Error('Pubsub cannot start before setup.');
    }

    this.subscriptions
      .filter((subscription) => !this.topics.has(subscription.topic))
      .forEach((subscription) => {
        this.logger.warn(
          `Pubsub consumer "${subscription.consumer}" subscribed to topic "${subscription.topic}", which no plugin registered. It will receive no events.`
        );
      });

    this.phase = 'started';

    return {
      publish: (pluginId, topic, init) => this.publish(pluginId, topic, init),
    };
  }

  public stop(): void {
    this.phase = 'stopped';
  }

  private async publish<TData>(
    pluginId: string,
    topic: Topic<TData>,
    init: PubSubEventInit<TData>
  ): Promise<PubSubPublishResult> {
    if (this.phase !== 'started') {
      throw new Error('Pubsub publish is not available after stop.');
    }

    if (!this.topics.has(topic.name)) {
      throw new Error(`Topic "${topic.name}" is not registered.`);
    }

    this.assertEventId(init.id);
    const serializedData = this.serializeData(init.data);
    if (this.checkJsonRoundTrip) {
      this.assertJsonRoundTrip(topic.name, init.data, serializedData);
    }

    const event: AcceptedEvent = {
      id: init.id,
      topic: topic.name,
      acceptedAt: new Date().toISOString(),
      serializedData,
    };

    this.logger.trace(
      `Plugin "${pluginId}" published event "${event.id}" on topic "${topic.name}".`
    );
    this.enqueue(event);

    return { id: event.id, acceptedAt: event.acceptedAt };
  }

  private registerTopic<TData>(pluginId: string, topic: Topic<TData>): void {
    if (this.phase !== 'setup') {
      throw new Error(`Cannot register topic "${topic.name}" outside of setup.`);
    }

    // A cast can still skip `defineTopic`. Re-check the name here.
    assertTopicName(topic.name);

    const registeredBy = this.topics.get(topic.name);
    if (registeredBy) {
      throw new Error(`Topic "${topic.name}" is already registered by "${registeredBy}".`);
    }

    this.topics.set(topic.name, pluginId);
  }

  private subscribe<TData>(
    pluginId: string,
    topic: Topic<TData>,
    { consumer, handler }: PubSubSubscription<TData>
  ): void {
    if (this.phase !== 'setup') {
      throw new Error(
        `Cannot subscribe consumer "${consumer}" to topic "${topic.name}" outside of setup.`
      );
    }

    // `Topic` is structural, so a caller can skip `defineTopic` and hand in `{ name }`.
    defineTopic(topic.name);

    const scopedConsumer = scopeConsumerName(pluginId, consumer);
    const alreadySubscribed = this.subscriptions.some(
      (subscription) =>
        subscription.topic === topic.name && subscription.consumer === scopedConsumer
    );
    if (alreadySubscribed) {
      throw new Error(
        `Consumer "${scopedConsumer}" is already subscribed to topic "${topic.name}".`
      );
    }

    this.subscriptions.push({
      topic: topic.name,
      consumer: scopedConsumer,
      handler: (event) => handler(event as PubSubEvent<TData>),
      queue: [],
      running: false,
      droppedWhileFull: 0,
    });
  }

  private enqueue(event: AcceptedEvent): void {
    this.subscriptions
      .filter((subscription) => subscription.topic === event.topic)
      .forEach((subscription) => {
        if (subscription.queue.length >= PUBSUB_MAX_PENDING_EVENTS) {
          this.noteQueueFull(subscription, event.topic);
          return;
        }

        subscription.queue.push(event);
        this.schedule(subscription);
      });
  }

  private schedule(subscription: Subscription): void {
    if (subscription.running || this.phase !== 'started') {
      return;
    }

    subscription.running = true;
    setImmediate(() => {
      void this.drain(subscription);
    });
  }

  private async drain(subscription: Subscription): Promise<void> {
    while (this.phase === 'started') {
      const accepted = subscription.queue.shift();
      if (!accepted) {
        break;
      }

      const event = this.deliverable(accepted);
      try {
        await subscription.handler(event);
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'unknown failure';
        this.logger.error(
          `Pubsub consumer "${subscription.consumer}" failed handling topic "${event.topic}" event "${event.id}": ${detail}`
        );
      }
    }

    subscription.running = false;
    this.logDroppedWhileFull(subscription);
  }

  /** Warn on the first drop, then count the rest until the queue drains. */
  private noteQueueFull(subscription: Subscription, topic: string): void {
    subscription.droppedWhileFull += 1;
    if (subscription.droppedWhileFull > 1) {
      return;
    }

    this.logger.warn(
      `Pubsub consumer "${subscription.consumer}" on topic "${topic}" has ${PUBSUB_MAX_PENDING_EVENTS} events waiting; further events for it will be dropped until the queue drains.`
    );
  }

  private logDroppedWhileFull(subscription: Subscription): void {
    if (subscription.droppedWhileFull === 0) {
      return;
    }

    const dropped = subscription.droppedWhileFull;
    subscription.droppedWhileFull = 0;
    this.logger.warn(
      `Pubsub consumer "${subscription.consumer}" on topic "${
        subscription.topic
      }" dropped ${dropped} ${dropped === 1 ? 'event' : 'events'} while its queue was full.`
    );
  }

  /** Each consumer gets its own parsed copy, as it would from a durable store. */
  private deliverable({
    id,
    topic,
    acceptedAt,
    serializedData,
  }: AcceptedEvent): PubSubEvent<unknown> {
    return Object.freeze({ id, topic, acceptedAt, data: JSON.parse(serializedData) });
  }

  private assertEventId(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('Pubsub event id must be a non-empty string.');
    }

    if (id.length > PUBSUB_MAX_ID_LENGTH) {
      throw new Error(
        `Pubsub event id is ${id.length} characters, which exceeds the ${PUBSUB_MAX_ID_LENGTH} character limit.`
      );
    }
  }

  private serializeData<TData>(data: TData): string {
    const serialized = this.tryStringify(data);
    if (serialized === undefined) {
      throw new Error('Pubsub event data must be JSON-serializable.');
    }

    const bytes = Buffer.byteLength(serialized, 'utf8');
    if (bytes > PUBSUB_MAX_DATA_BYTES) {
      throw new Error(
        `Pubsub event data is ${bytes} bytes, which exceeds the ${PUBSUB_MAX_DATA_BYTES} byte limit.`
      );
    }

    return serialized;
  }

  /**
   * Consumers get `JSON.parse(serialized)`, so anything the type system let through that JSON
   * cannot represent (`Date`, `Map`, class instances, `NaN`, `undefined` array items, ...) would
   * arrive as something else. Dev mode fails the publish and names the offending path; production
   * delivers what JSON produced.
   */
  private assertJsonRoundTrip(topic: string, data: unknown, serialized: string): void {
    const found = findJsonRoundTripMismatch(data, JSON.parse(serialized));
    if (found) {
      throw new Error(
        `Pubsub event data on topic "${topic}" does not survive the JSON round trip: ${found}. ` +
          'Use only plain objects, arrays, strings, finite numbers, booleans and null. ' +
          'This check only runs in development mode.'
      );
    }
  }

  /** `JSON.stringify` throws on cycles and BigInt, and returns `undefined` for non-JSON values. */
  private tryStringify<TData>(data: TData): string | undefined {
    try {
      return JSON.stringify(data);
    } catch {
      return undefined;
    }
  }
}
