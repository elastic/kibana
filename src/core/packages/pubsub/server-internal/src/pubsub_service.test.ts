/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AsyncLocalStorage } from 'async_hooks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { createTestEnv, getEnvOptions } from '@kbn/config-mocks';
import { defineTopic } from '@kbn/core-pubsub-server';
import type { PubSubEvent, PubSubEventInit, Topic } from '@kbn/core-pubsub-server';
import { loggerMock } from '@kbn/logging-mocks';
import { scopeConsumerName } from './consumer_name';
import type { InternalPubSubStart } from './internal_contracts';
import {
  PUBSUB_MAX_DATA_BYTES,
  PUBSUB_MAX_ID_LENGTH,
  PUBSUB_MAX_PENDING_EVENTS,
  PubSubService,
} from './pubsub_service';

const PLUGIN = 'ordersPlugin';

interface NamedData {
  message: string;
  name: string;
}
type NamedTopic = Topic<NamedData, 'cases.updated'>;
const topicFromData = defineTopic<NamedData>('cases.updated');
const topicFromSharedType = defineTopic<NamedTopic>('cases.updated');
const topicWithoutType = defineTopic('orders');
const _typedName: Topic<NamedData, string> = topicFromData;
const _sharedType: Topic<NamedData, 'cases.updated'> = topicFromSharedType;
const _untyped: Topic<never, string> = topicWithoutType;
void _typedName;
void _sharedType;
void _untyped;

let idCounter = 0;
const nextId = () => `evt-${++idCounter}`;

const flushDispatch = () => new Promise<void>((resolve) => setImmediate(resolve));

const deferred = () => {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve: () => resolve() };
};

describe('scopeConsumerName', () => {
  it('prefixes the plugin id and rejects an empty or dotted suffix', () => {
    expect(scopeConsumerName('pubsubExample', 'echo')).toBe('pubsubExample.echo');
    expect(() => scopeConsumerName('pubsubExample', '')).toThrow(/invalid/i);
    expect(() => scopeConsumerName('pubsubExample', 'echo.extra')).toThrow(/invalid/i);
  });
});

describe('PubSubService registration', () => {
  const createService = () => new PubSubService(mockCoreContext.create());

  it('registers a topic during setup', () => {
    const setup = createService().setup();

    expect(() => setup.registerTopic(PLUGIN, defineTopic('orders'))).not.toThrow();
  });

  it('throws when the same topic name is registered twice, naming the first registrant', () => {
    const setup = createService().setup();

    setup.registerTopic(PLUGIN, defineTopic('orders'));

    expect(() => setup.registerTopic('shippingPlugin', defineTopic('orders'))).toThrow(
      'Topic "orders" is already registered by "ordersPlugin".'
    );
  });

  it('throws when a topic is registered after setup', () => {
    const service = createService();
    const setup = service.setup();
    service.start();

    expect(() => setup.registerTopic(PLUGIN, defineTopic('orders'))).toThrow(
      'Cannot register topic "orders" outside of setup.'
    );
  });

  it('throws when a topic name has an empty segment, a trailing dot, or is too long', () => {
    expect(() => defineTopic('')).toThrow(/invalid/i);
    expect(() => defineTopic('has space')).toThrow(/invalid/i);
    expect(() => defineTopic('a..b')).toThrow(/invalid/i);
    expect(() => defineTopic('orders.')).toThrow(/invalid/i);
    expect(() => defineTopic('a'.repeat(257))).toThrow(/invalid/i);
    expect(() => defineTopic('cases.updated')).not.toThrow();
  });

  it('throws when a topic is registered without going through defineTopic', () => {
    const setup = createService().setup();

    expect(() => setup.registerTopic('ordersPlugin', { name: 'a..b' } as Topic)).toThrow(
      /invalid/i
    );
  });

  it('throws when a subscription uses a topic that skipped defineTopic', () => {
    const setup = createService().setup();

    expect(() =>
      setup.subscribe('ordersPlugin', { name: 'a..b' } as Topic, {
        consumer: 'sync',
        handler: () => {},
      })
    ).toThrow(/invalid/i);
  });

  it('starts when a subscription is added before its topic is registered', () => {
    const service = createService();
    const setup = service.setup();
    const topic = defineTopic('orders');

    setup.subscribe(PLUGIN, topic, { consumer: 'sync', handler: () => {} });
    setup.registerTopic(PLUGIN, topic);

    expect(() => service.start()).not.toThrow();
  });

  it('starts and warns when a subscription topic was never registered, for example because the producer is disabled', () => {
    const logger = loggerMock.create();
    const service = new PubSubService(mockCoreContext.create({ logger }));
    const setup = service.setup();

    setup.subscribe(PLUGIN, defineTopic('orders'), { consumer: 'sync', handler: () => {} });

    expect(() => service.start()).not.toThrow();
    const [warning] = loggerMock.collect(logger).warn.map(([message]) => String(message));
    expect(warning).toContain('ordersPlugin.sync');
    expect(warning).toContain('orders');
    expect(warning).toContain('no plugin registered');
  });

  it('scopes the consumer name with the plugin id and rejects a second subscription under the same name', () => {
    const setup = createService().setup();
    const topic = defineTopic('orders');
    setup.registerTopic(PLUGIN, topic);
    setup.subscribe(PLUGIN, topic, { consumer: 'sync', handler: () => {} });

    expect(() => setup.subscribe(PLUGIN, topic, { consumer: 'sync', handler: () => {} })).toThrow(
      'Consumer "ordersPlugin.sync" is already subscribed to topic "orders".'
    );
  });

  it('lets two plugins use the same plugin-local consumer name', () => {
    const setup = createService().setup();
    const topic = defineTopic('orders');
    setup.registerTopic(PLUGIN, topic);
    setup.subscribe(PLUGIN, topic, { consumer: 'sync', handler: () => {} });

    expect(() =>
      setup.subscribe('shippingPlugin', topic, { consumer: 'sync', handler: () => {} })
    ).not.toThrow();
  });

  it('rejects a consumer name that could impersonate another plugin', () => {
    const setup = createService().setup();
    const topic = defineTopic('orders');
    setup.registerTopic(PLUGIN, topic);

    expect(() =>
      setup.subscribe(PLUGIN, topic, { consumer: 'shippingPlugin.sync', handler: () => {} })
    ).toThrow(/invalid/i);
  });
});

describe('PubSubService dispatch', () => {
  const createHarness = () => {
    const logger = loggerMock.create();
    const service = new PubSubService(mockCoreContext.create({ logger }));
    const setup = service.setup();
    const topic = defineTopic<{ secret: string }>('orders');
    setup.registerTopic(PLUGIN, topic);

    return { logger, service, setup, topic };
  };

  const start = (service: PubSubService): InternalPubSubStart => service.start();

  it('resolves publish before the handler starts, and does not wait for the handler to finish', async () => {
    const { service, setup, topic } = createHarness();
    let started = false;
    let finished = false;
    const gate = deferred();

    setup.subscribe(PLUGIN, topic, {
      consumer: 'sync',
      handler: async () => {
        started = true;
        await gate.promise;
        finished = true;
      },
    });

    const { publish } = start(service);
    const published = publish(PLUGIN, topic, { id: nextId(), data: { secret: 'one' } });

    await published;
    expect(started).toBe(false);

    await flushDispatch();
    expect(started).toBe(true);
    expect(finished).toBe(false);

    gate.resolve();
    await flushDispatch();
    expect(finished).toBe(true);
  });

  it('does not run handlers in the publisher request context', async () => {
    const { service, setup, topic } = createHarness();
    const requestContext = new AsyncLocalStorage<string>();
    const seen: Array<{ id: string; store: string | undefined }> = [];
    const gate = deferred();
    const firstId = nextId();
    const secondId = nextId();

    setup.subscribe(PLUGIN, topic, {
      consumer: 'sync',
      handler: async (event) => {
        seen.push({ id: event.id, store: requestContext.getStore() });
        if (event.id === firstId) {
          await gate.promise;
        }
      },
    });

    const { publish } = start(service);

    await requestContext.run('alice', () =>
      publish(PLUGIN, topic, { id: firstId, data: { secret: 'one' } })
    );
    await flushDispatch();
    await requestContext.run('bob', () =>
      publish(PLUGIN, topic, { id: secondId, data: { secret: 'two' } })
    );
    gate.resolve();
    await flushDispatch();

    expect(seen).toEqual([
      { id: firstId, store: undefined },
      { id: secondId, store: undefined },
    ]);
  });

  it('delivers every event on the topic to every consumer, and nothing from other topics', async () => {
    const { service, setup, topic } = createHarness();
    const other = defineTopic<{ secret: string }>('shipments');
    setup.registerTopic('shippingPlugin', other);
    const seenByOrders: string[] = [];
    const seenByShipments: string[] = [];

    setup.subscribe(PLUGIN, topic, {
      consumer: 'sync',
      handler: (event) => {
        seenByOrders.push(event.id);
      },
    });
    setup.subscribe('shippingPlugin', other, {
      consumer: 'sync',
      handler: (event) => {
        seenByShipments.push(event.id);
      },
    });

    const { publish } = start(service);
    const first = await publish(PLUGIN, topic, { id: nextId(), data: { secret: 'one' } });
    const second = await publish('anyPlugin', topic, { id: nextId(), data: { secret: 'two' } });
    const shipment = await publish('shippingPlugin', other, {
      id: nextId(),
      data: { secret: 'three' },
    });
    await flushDispatch();

    expect(seenByOrders).toEqual([first.id, second.id]);
    expect(seenByShipments).toEqual([shipment.id]);
  });

  it('keeps a thrown handler from rejecting publish, from blocking another consumer, and from blocking the next event', async () => {
    const { logger, service, setup, topic } = createHarness();
    const secret = 'super-secret-data';
    let failures = 0;
    const delivered: string[] = [];

    setup.subscribe(PLUGIN, topic, {
      consumer: 'fails',
      handler: () => {
        failures++;
        if (failures === 1) {
          throw new Error('nope');
        }
        return Promise.reject(new Error('nope'));
      },
    });
    setup.subscribe(PLUGIN, topic, {
      consumer: 'ok',
      handler: (event) => {
        delivered.push(event.id);
      },
    });

    const { publish } = start(service);
    const first = await publish(PLUGIN, topic, { id: nextId(), data: { secret } });
    const second = await publish(PLUGIN, topic, { id: nextId(), data: { secret } });
    await flushDispatch();

    expect(failures).toBe(2);
    expect(delivered).toEqual([first.id, second.id]);

    const logged = loggerMock
      .collect(logger)
      .error.map(([message]) => String(message))
      .join('\n');
    expect(logged).toContain('ordersPlugin.fails');
    expect(logged).toContain('orders');
    expect(logged).toContain(first.id);
    expect(logged).toContain(second.id);
    expect(logged).not.toContain(secret);
  });

  it('runs one consumer serially and lets two consumers of the same event overlap', async () => {
    const { service, setup, topic } = createHarness();
    let active = 0;
    let maxActive = 0;
    let serialCalls = 0;
    const firstGate = deferred();
    const bothStarted = deferred();
    let startedConsumers = 0;

    setup.subscribe(PLUGIN, topic, {
      consumer: 'serial',
      handler: async () => {
        serialCalls++;
        active++;
        maxActive = Math.max(maxActive, active);
        if (serialCalls === 1) {
          await firstGate.promise;
        }
        active--;
      },
    });

    const markStarted = () => {
      startedConsumers++;
      if (startedConsumers === 2) {
        bothStarted.resolve();
      }
    };
    const overlapGate = deferred();
    setup.subscribe(PLUGIN, topic, {
      consumer: 'left',
      handler: async () => {
        markStarted();
        await overlapGate.promise;
      },
    });
    setup.subscribe(PLUGIN, topic, {
      consumer: 'right',
      handler: async () => {
        markStarted();
        await overlapGate.promise;
      },
    });

    const { publish } = start(service);
    await publish(PLUGIN, topic, { id: nextId(), data: { secret: 'one' } });
    await flushDispatch();
    await publish(PLUGIN, topic, { id: nextId(), data: { secret: 'two' } });
    await flushDispatch();

    expect(maxActive).toBe(1);
    await bothStarted.promise;

    firstGate.resolve();
    overlapGate.resolve();
    await flushDispatch();
    expect(maxActive).toBe(1);
  });

  it('throws when publishing a topic that was defined but never registered', async () => {
    const service = new PubSubService(mockCoreContext.create());
    service.setup();
    const definedOnly = defineTopic<{ secret: string }>('shipments');
    const { publish } = start(service);

    await expect(
      publish(PLUGIN, definedOnly, { id: nextId(), data: { secret: 'missing' } })
    ).rejects.toThrow('Topic "shipments" is not registered.');
  });

  it('throws for oversized or circular data', async () => {
    const { service, topic } = createHarness();
    const { publish } = start(service);

    const oversized = 'a'.repeat(PUBSUB_MAX_DATA_BYTES);
    await expect(
      publish(PLUGIN, topic, { id: nextId(), data: { secret: oversized } })
    ).rejects.toThrow(/exceeds/);

    const circular: { self?: object; secret: string } = { secret: 'loop' };
    circular.self = circular;
    await expect(publish(PLUGIN, topic, { id: nextId(), data: circular })).rejects.toThrow(
      /JSON-serializable/
    );
  });

  it('rejects a missing, empty, or oversized event id', async () => {
    const { service, topic } = createHarness();
    const { publish } = start(service);
    const data = { secret: 'id' };

    const missingId = { data } as PubSubEventInit<typeof data>;

    await expect(publish(PLUGIN, topic, missingId)).rejects.toThrow(/non-empty string/);
    await expect(publish(PLUGIN, topic, { id: '', data })).rejects.toThrow(/non-empty string/);
    await expect(
      publish(PLUGIN, topic, { id: 'a'.repeat(PUBSUB_MAX_ID_LENGTH + 1), data })
    ).rejects.toThrow(/exceeds/);
  });

  it('delivers two events with the same id twice: phase 1 does not deduplicate', async () => {
    const { service, setup, topic } = createHarness();
    const seen: string[] = [];
    setup.subscribe(PLUGIN, topic, {
      consumer: 'sync',
      handler: (event) => {
        seen.push(event.id);
      },
    });

    const { publish } = start(service);
    await publish(PLUGIN, topic, { id: 'webhook-1', data: { secret: 'first' } });
    await publish(PLUGIN, topic, { id: 'webhook-1', data: { secret: 'retry' } });
    await flushDispatch();

    expect(seen).toEqual(['webhook-1', 'webhook-1']);
  });

  it('drops only the consumer whose queue is full and still resolves publish', async () => {
    const { logger, service, setup, topic } = createHarness();
    const secret = 'dropped-secret';
    let slowCalls = 0;
    const gate = deferred();

    setup.subscribe(PLUGIN, topic, {
      consumer: 'slow',
      handler: async () => {
        slowCalls++;
        if (slowCalls === 1) {
          await gate.promise;
        }
      },
    });

    let fastCalls = 0;
    setup.subscribe(PLUGIN, topic, {
      consumer: 'fast',
      handler: () => {
        fastCalls++;
      },
    });

    const { publish } = start(service);
    const publishOne = (value: string) =>
      publish(PLUGIN, topic, { id: nextId(), data: { secret: value } });

    await publishOne('first');
    await flushDispatch();

    for (let index = 0; index < PUBSUB_MAX_PENDING_EVENTS; index++) {
      await publishOne(`queued-${index}`);
      await flushDispatch();
    }

    const droppedIds = await Promise.all([
      publishOne(secret),
      publishOne(secret),
      publishOne(secret),
    ]);
    await flushDispatch();

    expect(fastCalls).toBe(PUBSUB_MAX_PENDING_EVENTS + 4);
    expect(slowCalls).toBe(1);

    const warnings = () => loggerMock.collect(logger).warn.map(([message]) => String(message));
    const whileFull = warnings().join('\n');
    expect(warnings()).toHaveLength(1);
    expect(whileFull).toContain('ordersPlugin.slow');
    expect(whileFull).toContain('will be dropped until the queue drains');
    expect(whileFull).not.toContain(secret);
    droppedIds.forEach(({ id }) => expect(whileFull).not.toContain(id));

    gate.resolve();
    await flushDispatch();
    expect(slowCalls).toBe(PUBSUB_MAX_PENDING_EVENTS + 1);

    const drained = warnings().join('\n');
    expect(warnings().filter((message) => message.includes('will be dropped'))).toHaveLength(1);
    expect(drained).toContain('dropped 3 events');
    expect(drained).not.toContain(secret);
  });

  it('does not start a queued handler after stop, and resolves later publishes', async () => {
    const { logger, service, setup, topic } = createHarness();
    let calls = 0;
    const gate = deferred();

    setup.subscribe(PLUGIN, topic, {
      consumer: 'slow',
      handler: async () => {
        calls++;
        if (calls === 1) {
          await gate.promise;
        }
      },
    });

    const { publish } = start(service);
    await publish(PLUGIN, topic, { id: nextId(), data: { secret: 'in-flight' } });
    await flushDispatch();
    await publish(PLUGIN, topic, { id: nextId(), data: { secret: 'queued' } });

    service.stop();
    gate.resolve();
    await flushDispatch();

    expect(calls).toBe(1);
    const lateId = nextId();
    await expect(publish(PLUGIN, topic, { id: lateId, data: { secret: 'late' } })).resolves.toEqual(
      { id: lateId, acceptedAt: expect.any(String) }
    );

    const debug = loggerMock
      .collect(logger)
      .debug.map(([message]) => String(message))
      .join('\n');
    expect(debug).toContain(lateId);
    expect(debug).toContain('stopping');
    expect(debug).not.toContain('late');
  });
});

describe('PubSubEvent shape', () => {
  const createHarness = () => {
    const service = new PubSubService(mockCoreContext.create());
    const setup = service.setup();
    const topic = defineTopic<{ secret: string; tags?: string[] }>('orders');
    setup.registerTopic(PLUGIN, topic);
    const received: Array<PubSubEvent<{ secret: string; tags?: string[] }>> = [];
    const subscribe = (consumer: string) =>
      setup.subscribe(PLUGIN, topic, {
        consumer,
        handler: (event) => {
          received.push(event);
        },
      });

    return { service, topic, received, subscribe };
  };

  it('resolves with the id and acceptedAt, and delivers the producer event plus topic and acceptedAt', async () => {
    const { service, topic, received, subscribe } = createHarness();
    subscribe('sync');
    const { publish } = service.start();
    const data = { secret: 'same' };

    const result = await publish(PLUGIN, topic, { id: 'order-42:v7', data });
    await flushDispatch();

    expect(result).toEqual({ id: 'order-42:v7', acceptedAt: expect.any(String) });
    expect(Number.isNaN(Date.parse(result.acceptedAt))).toBe(false);

    const [event] = received;
    expect(event).toEqual({
      id: 'order-42:v7',
      topic: 'orders',
      data,
      acceptedAt: result.acceptedAt,
    });
    expect(Object.isFrozen(event)).toBe(true);
  });

  it('gives each consumer its own copy of the data, detached from the publisher', async () => {
    const { service, topic, received, subscribe } = createHarness();
    subscribe('left');
    subscribe('right');
    const { publish } = service.start();
    const data = { secret: 'original', tags: ['a'] };

    await publish(PLUGIN, topic, { id: nextId(), data });
    data.secret = 'mutated-by-publisher';
    data.tags.push('b');
    await flushDispatch();

    const [left, right] = received;
    expect(left.data).toEqual({ secret: 'original', tags: ['a'] });
    expect(right.data).toEqual({ secret: 'original', tags: ['a'] });
    expect(left.data).not.toBe(right.data);

    left.data.tags?.push('left-only');
    expect(right.data.tags).toEqual(['a']);
  });

  it('delivers data with JSON semantics, so undefined properties are dropped', async () => {
    const { service, topic, received, subscribe } = createHarness();
    subscribe('sync');
    const { publish } = service.start();

    await publish(PLUGIN, topic, { id: nextId(), data: { secret: 'json', tags: undefined } });
    await flushDispatch();

    expect(received[0].data).toEqual({ secret: 'json' });
    expect('tags' in received[0].data).toBe(false);
  });
});

describe('JSON round-trip check', () => {
  interface Loose {
    secret: string;
    createdAt: Date;
  }

  const createHarness = (dev: boolean) => {
    const env = createTestEnv({ envOptions: getEnvOptions({ cliArgs: { dev } }) });
    const service = new PubSubService(mockCoreContext.create({ env }));
    const setup = service.setup();
    const topic = defineTopic<Loose>('orders');
    setup.registerTopic(PLUGIN, topic);
    const received: Array<PubSubEvent<Loose>> = [];
    setup.subscribe(PLUGIN, topic, {
      consumer: 'sync',
      handler: (event) => {
        received.push(event);
      },
    });
    return { service, topic, received };
  };

  it('in development, rejects data that would arrive mangled and names the path', async () => {
    const { service, topic, received } = createHarness(true);
    const { publish } = service.start();

    await expect(
      publish(PLUGIN, topic, { id: nextId(), data: { secret: 'dev', createdAt: new Date(0) } })
    ).rejects.toThrow(
      'Pubsub event data on topic "orders" does not survive the JSON round trip: ' +
        'data.createdAt is an instance of Date and arrives as a string.'
    );
    await flushDispatch();
    expect(received).toHaveLength(0);
  });

  it('in production, delivers whatever JSON produced', async () => {
    const { service, topic, received } = createHarness(false);
    const { publish } = service.start();

    await publish(PLUGIN, topic, {
      id: nextId(),
      data: { secret: 'prod', createdAt: new Date(0) },
    });
    await flushDispatch();

    expect(received[0].data).toEqual({ secret: 'prod', createdAt: '1970-01-01T00:00:00.000Z' });
  });
});
