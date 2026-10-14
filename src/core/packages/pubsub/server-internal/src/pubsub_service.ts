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
import type {
  PubSubEvent,
  PubSubEventInit,
  PubSubSubscription,
  Topic,
} from '@kbn/core-pubsub-server';
import { scopeConsumerName } from './consumer_name';
import type { InternalPubSubSetup, InternalPubSubStart } from './internal_contracts';

type Phase = 'created' | 'setup' | 'started' | 'stopped';

type SubscriptionHandler = (event: PubSubEvent<unknown>) => void | Promise<void>;

interface Subscription {
  readonly topic: string;
  /** Full consumer name, `${pluginId}.${consumer}`. */
  readonly consumer: string;
  readonly pluginId: string;
  readonly handler: SubscriptionHandler;
  readonly queue: Array<PubSubEvent<unknown>>;
  running: boolean;
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
  private readonly subscriptionKeys = new Set<string>();
  private phase: Phase = 'created';

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('pubsub');
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

    this.subscriptions.forEach((subscription) => {
      if (!this.topics.has(subscription.topic)) {
        throw new Error(
          `Cannot start pubsub: consumer "${subscription.consumer}" subscribed to topic "${subscription.topic}", which is not registered.`
        );
      }
    });

    this.phase = 'started';

    return {
      publish: (pluginId, topic, init) => this.publish(pluginId, topic, init),
    };
  }

  public stop(): void {
    this.phase = 'stopped';
  }

  public async publish<TData>(
    pluginId: string,
    topic: Topic<TData>,
    init: PubSubEventInit<TData>
  ): Promise<PubSubEvent<TData>> {
    this.assertCanPublish();

    if (!this.topics.has(topic.name)) {
      throw new Error(`Topic "${topic.name}" is not registered.`);
    }

    this.assertEventId(init.id);
    this.assertDataSize(init.data);

    const event: PubSubEvent<TData> = Object.freeze({
      id: init.id,
      topic: topic.name,
      data: init.data,
      acceptedAt: new Date().toISOString(),
    });

    this.logger.trace(
      `Plugin "${pluginId}" published event "${event.id}" on topic "${topic.name}".`
    );
    this.enqueue(event);

    return event;
  }

  private registerTopic<TData>(pluginId: string, topic: Topic<TData>): void {
    if (this.phase !== 'setup') {
      throw new Error(`Cannot register topic "${topic.name}" outside of setup.`);
    }

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

    const scopedConsumer = scopeConsumerName(pluginId, consumer);
    const key = `${topic.name}\n${scopedConsumer}`;
    if (this.subscriptionKeys.has(key)) {
      throw new Error(
        `Consumer "${scopedConsumer}" is already subscribed to topic "${topic.name}".`
      );
    }

    this.subscriptionKeys.add(key);
    this.subscriptions.push({
      topic: topic.name,
      consumer: scopedConsumer,
      pluginId,
      handler: (event) => handler(event as PubSubEvent<TData>),
      queue: [],
      running: false,
    });
  }

  private enqueue<TData>(event: PubSubEvent<TData>): void {
    this.subscriptions
      .filter((subscription) => subscription.topic === event.topic)
      .forEach((subscription) => {
        if (subscription.queue.length >= PUBSUB_MAX_PENDING_EVENTS) {
          this.logger.warn(
            `Pubsub consumer "${subscription.consumer}" dropped event "${event.id}" on topic "${event.topic}" because ${PUBSUB_MAX_PENDING_EVENTS} events are already waiting.`
          );
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
    while (this.phase === 'started' && subscription.queue.length > 0) {
      const event = subscription.queue.shift();
      if (!event) {
        break;
      }

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

    if (this.phase === 'started' && subscription.queue.length > 0) {
      this.schedule(subscription);
    }
  }

  private assertCanPublish(): void {
    if (this.phase === 'stopped') {
      throw new Error('Pubsub publish is not available after stop.');
    }

    if (this.phase !== 'started') {
      throw new Error('Pubsub publish is only available after start.');
    }
  }

  private assertEventId(id: unknown): void {
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('Pubsub event id must be a non-empty string.');
    }

    if (id.length > PUBSUB_MAX_ID_LENGTH) {
      throw new Error(
        `Pubsub event id is ${id.length} characters, which exceeds the ${PUBSUB_MAX_ID_LENGTH} character limit.`
      );
    }
  }

  private assertDataSize(data: unknown): void {
    let serialized: string;
    try {
      const encoded = JSON.stringify(data);
      if (typeof encoded !== 'string') {
        throw new Error('Pubsub event data must be JSON-serializable.');
      }
      serialized = encoded;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Pubsub event data')) {
        throw error;
      }
      throw new Error('Pubsub event data must be JSON-serializable.');
    }

    const bytes = Buffer.byteLength(serialized, 'utf8');
    if (bytes > PUBSUB_MAX_DATA_BYTES) {
      throw new Error(
        `Pubsub event data is ${bytes} bytes, which exceeds the ${PUBSUB_MAX_DATA_BYTES} byte limit.`
      );
    }
  }
}
