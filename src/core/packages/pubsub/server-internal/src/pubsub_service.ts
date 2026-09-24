/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type {
  PubSubEvent,
  PubSubHandler,
  PubSubSetup,
  PubSubStart,
  PublishInput,
  Topic,
} from '@kbn/core-pubsub-server';

type Phase = 'created' | 'setup' | 'started' | 'stopped';

type SubscriptionHandler = (event: PubSubEvent<unknown>) => void | Promise<void>;

interface Subscription {
  readonly topic: string;
  readonly consumer: string;
  readonly namespaces: ReadonlySet<string>;
  readonly handler: SubscriptionHandler;
  readonly queue: Array<PubSubEvent<unknown>>;
  running: boolean;
}

/** Pending events per consumer, not counting the one already in flight. */
export const PUBSUB_MAX_PENDING_EVENTS = 1000;

/** UTF-8 byte size of `JSON.stringify(payload)`. */
export const PUBSUB_MAX_PAYLOAD_BYTES = 256 * 1024;

/** @internal */
export class PubSubService implements CoreService<PubSubSetup, PubSubStart> {
  private readonly logger: Logger;
  private readonly topics = new Set<string>();
  private readonly subscriptions: Subscription[] = [];
  private readonly subscriptionKeys = new Set<string>();
  private phase: Phase = 'created';

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('pubsub');
  }

  public setup(): PubSubSetup {
    if (this.phase !== 'created') {
      throw new Error('Pubsub setup can only be called once.');
    }

    this.phase = 'setup';
    this.logger.debug('Pubsub setup complete');

    return {
      registerTopic: (topic) => {
        this.registerTopic(topic);
      },
      subscribe: (topic, consumer, namespaces, handler) => {
        this.subscribe(topic, consumer, namespaces, handler);
      },
    };
  }

  public start(): PubSubStart {
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
      publish: (topic, input) => this.publish(topic, input),
    };
  }

  public stop(): void {
    this.phase = 'stopped';
  }

  public async publish<TPayload>(
    topic: Topic<TPayload>,
    input: PublishInput<TPayload>
  ): Promise<PubSubEvent<TPayload>> {
    if (this.phase !== 'started') {
      throw new Error('Pubsub publish is only available after start.');
    }

    if (!this.topics.has(topic.name)) {
      throw new Error(`Topic "${topic.name}" is not registered.`);
    }

    const namespaces = this.copyNamespaces(input.namespaces);
    this.assertPayloadSize(input.payload);

    const event: PubSubEvent<TPayload> = Object.freeze({
      id: randomUUID(),
      topic: topic.name,
      namespaces,
      payload: input.payload,
      acceptedAt: new Date().toISOString(),
    });

    this.enqueue(event);

    return event;
  }

  private registerTopic<TPayload>(topic: Topic<TPayload>): void {
    if (this.phase !== 'setup') {
      throw new Error(`Cannot register topic "${topic.name}" outside of setup.`);
    }

    if (this.topics.has(topic.name)) {
      throw new Error(`Topic "${topic.name}" is already registered.`);
    }

    this.topics.add(topic.name);
  }

  private subscribe<TPayload>(
    topic: Topic<TPayload>,
    consumer: string,
    namespaces: readonly string[],
    handler: PubSubHandler<TPayload>
  ): void {
    if (this.phase !== 'setup') {
      throw new Error(
        `Cannot subscribe consumer "${consumer}" to topic "${topic.name}" outside of setup.`
      );
    }

    if (consumer.length === 0) {
      throw new Error('Pubsub consumer name must not be empty.');
    }

    const key = `${topic.name}\n${consumer}`;
    if (this.subscriptionKeys.has(key)) {
      throw new Error(`Consumer "${consumer}" is already subscribed to topic "${topic.name}".`);
    }

    const namespaceSet = new Set(this.copyNamespaces(namespaces));
    this.subscriptionKeys.add(key);
    this.subscriptions.push({
      topic: topic.name,
      consumer,
      namespaces: namespaceSet,
      handler: (event) => handler(event as PubSubEvent<TPayload>),
      queue: [],
      running: false,
    });
  }

  private enqueue<TPayload>(event: PubSubEvent<TPayload>): void {
    this.subscriptions.forEach((subscription) => {
      if (subscription.topic !== event.topic) {
        return;
      }

      const matches = event.namespaces.some((namespace) => subscription.namespaces.has(namespace));
      if (!matches) {
        return;
      }

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

  private copyNamespaces(namespaces: readonly string[]): readonly string[] {
    if (!Array.isArray(namespaces) || namespaces.length === 0) {
      throw new Error('Pubsub namespaces must be a non-empty array.');
    }

    if (namespaces.some((namespace) => typeof namespace !== 'string' || namespace.length === 0)) {
      throw new Error('Pubsub namespaces must be non-empty strings.');
    }

    return Object.freeze([...namespaces]);
  }

  private assertPayloadSize(payload: unknown): void {
    let serialized: string;
    try {
      const encoded = JSON.stringify(payload);
      if (typeof encoded !== 'string') {
        throw new Error('Pubsub payload must be JSON-serializable.');
      }
      serialized = encoded;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Pubsub payload')) {
        throw error;
      }
      throw new Error('Pubsub payload must be JSON-serializable.');
    }

    const bytes = Buffer.byteLength(serialized, 'utf8');
    if (bytes > PUBSUB_MAX_PAYLOAD_BYTES) {
      throw new Error(
        `Pubsub payload is ${bytes} bytes, which exceeds the ${PUBSUB_MAX_PAYLOAD_BYTES} byte limit.`
      );
    }
  }
}
