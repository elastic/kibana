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

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { defineTopic, scopeConsumerName } from '@kbn/core-pubsub-server';
import type { PubSubStart } from '@kbn/core-pubsub-server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  PUBSUB_MAX_PAYLOAD_BYTES,
  PUBSUB_MAX_PENDING_EVENTS,
  PubSubService,
} from './pubsub_service';

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

  it('does not register a topic when it is only defined', () => {
    const service = createService();
    const setup = service.setup();
    const topic = defineTopic('orders');

    expect(() => setup.registerTopic(topic)).not.toThrow();
  });

  it('throws when the same topic name is registered twice', () => {
    const setup = createService().setup();
    const topic = defineTopic('orders');

    setup.registerTopic(topic);

    expect(() => setup.registerTopic(defineTopic('orders'))).toThrow(
      'Topic "orders" is already registered.'
    );
  });

  it('throws when a topic is registered after setup', () => {
    const service = createService();
    const setup = service.setup();
    service.start();

    expect(() => setup.registerTopic(defineTopic('orders'))).toThrow(
      'Cannot register topic "orders" outside of setup.'
    );
  });

  it('throws when defineTopic is given an invalid name', () => {
    expect(() => defineTopic('')).toThrow(/invalid/i);
    expect(() => defineTopic('has space')).toThrow(/invalid/i);
  });

  it('starts when a subscription is added before its topic is registered', () => {
    const service = createService();
    const setup = service.setup();
    const topic = defineTopic('orders');

    setup.subscribe(topic, 'ordersPlugin.sync', ['default'], () => {});
    setup.registerTopic(topic);

    expect(() => service.start()).not.toThrow();
  });

  it('fails start when a subscription topic was never registered', () => {
    const service = createService();
    const setup = service.setup();

    setup.subscribe(defineTopic('orders'), 'ordersPlugin.sync', ['default'], () => {});

    expect(() => service.start()).toThrow(/not registered/);
  });

  it('throws when the same consumer subscribes to a topic twice', () => {
    const setup = createService().setup();
    const topic = defineTopic('orders');
    setup.registerTopic(topic);
    setup.subscribe(topic, 'ordersPlugin.sync', ['default'], () => {});

    expect(() => setup.subscribe(topic, 'ordersPlugin.sync', ['eu'], () => {})).toThrow(
      'Consumer "ordersPlugin.sync" is already subscribed to topic "orders".'
    );
  });
});

describe('PubSubService dispatch', () => {
  const createHarness = () => {
    const logger = loggerMock.create();
    const service = new PubSubService(mockCoreContext.create({ logger }));
    const setup = service.setup();
    const topic = defineTopic<{ secret: string }>('orders');
    setup.registerTopic(topic);

    return { logger, service, setup, topic };
  };

  const start = (service: PubSubService): PubSubStart => service.start();

  it('resolves publish before the handler starts, and does not wait for the handler to finish', async () => {
    const { service, setup, topic } = createHarness();
    let started = false;
    let finished = false;
    const gate = deferred();

    setup.subscribe(topic, 'ordersPlugin.sync', ['default'], async () => {
      started = true;
      await gate.promise;
      finished = true;
    });

    const { publish } = start(service);
    const published = publish(topic, { namespaces: ['default'], payload: { secret: 'one' } });

    await published;
    expect(started).toBe(false);

    await flushDispatch();
    expect(started).toBe(true);
    expect(finished).toBe(false);

    gate.resolve();
    await flushDispatch();
    expect(finished).toBe(true);
  });

  it('keeps a thrown handler from rejecting publish, from blocking another consumer, and from blocking the next event', async () => {
    const { logger, service, setup, topic } = createHarness();
    const secret = 'super-secret-payload';
    let failures = 0;
    const delivered: string[] = [];

    setup.subscribe(topic, 'ordersPlugin.fails', ['default'], () => {
      failures++;
      if (failures === 1) {
        throw new Error('nope');
      }
      return Promise.reject(new Error('nope'));
    });
    setup.subscribe(topic, 'ordersPlugin.ok', ['default'], (event) => {
      delivered.push(event.id);
    });

    const { publish } = start(service);
    const first = await publish(topic, { namespaces: ['default'], payload: { secret } });
    const second = await publish(topic, { namespaces: ['default'], payload: { secret } });
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

    setup.subscribe(topic, 'ordersPlugin.serial', ['default'], async () => {
      serialCalls++;
      active++;
      maxActive = Math.max(maxActive, active);
      if (serialCalls === 1) {
        await firstGate.promise;
      }
      active--;
    });

    const markStarted = () => {
      startedConsumers++;
      if (startedConsumers === 2) {
        bothStarted.resolve();
      }
    };
    const overlapGate = deferred();
    setup.subscribe(topic, 'ordersPlugin.left', ['default'], async () => {
      markStarted();
      await overlapGate.promise;
    });
    setup.subscribe(topic, 'ordersPlugin.right', ['default'], async () => {
      markStarted();
      await overlapGate.promise;
    });

    const { publish } = start(service);
    await publish(topic, { namespaces: ['default'], payload: { secret: 'one' } });
    await flushDispatch();
    await publish(topic, { namespaces: ['default'], payload: { secret: 'two' } });
    await flushDispatch();

    expect(maxActive).toBe(1);
    await bothStarted.promise;

    firstGate.resolve();
    overlapGate.resolve();
    await flushDispatch();
    expect(maxActive).toBe(1);
  });

  it('does not call a handler whose namespaces do not intersect the event', async () => {
    const { service, setup, topic } = createHarness();
    const seen: string[] = [];

    setup.subscribe(topic, 'ordersPlugin.eu', ['eu'], (event) => {
      seen.push(event.id);
    });

    const { publish } = start(service);
    await publish(topic, { namespaces: ['us'], payload: { secret: 'nope' } });
    const delivered = await publish(topic, {
      namespaces: ['us', 'eu'],
      payload: { secret: 'yes' },
    });
    await flushDispatch();

    expect(seen).toEqual([delivered.id]);
  });

  it('throws for missing namespaces, an unknown topic, an oversized payload, and publish before start', async () => {
    const { service, setup, topic } = createHarness();
    const unregistered = defineTopic('shipments');

    expect(() => setup.subscribe(topic, 'ordersPlugin.sync', [], () => {})).toThrow(/namespaces/);

    await expect(
      service.publish(topic, { namespaces: ['default'], payload: { secret: 'early' } })
    ).rejects.toThrow(/after start/);

    const { publish } = start(service);

    await expect(publish(topic, { namespaces: [], payload: { secret: 'empty' } })).rejects.toThrow(
      /namespaces/
    );
    await expect(
      publish(unregistered, { namespaces: ['default'], payload: { secret: 'missing' } })
    ).rejects.toThrow(/not registered/);

    const oversized = 'a'.repeat(PUBSUB_MAX_PAYLOAD_BYTES);
    await expect(
      publish(topic, { namespaces: ['default'], payload: { secret: oversized } })
    ).rejects.toThrow(/exceeds/);

    const circular: { self?: object; secret: string } = { secret: 'loop' };
    circular.self = circular;
    await expect(publish(topic, { namespaces: ['default'], payload: circular })).rejects.toThrow(
      /JSON-serializable/
    );
  });

  it('drops only the consumer whose queue is full and still resolves publish', async () => {
    const { logger, service, setup, topic } = createHarness();
    const secret = 'dropped-secret';
    let slowCalls = 0;
    const gate = deferred();

    setup.subscribe(topic, 'ordersPlugin.slow', ['default'], async () => {
      slowCalls++;
      if (slowCalls === 1) {
        await gate.promise;
      }
    });

    let fastCalls = 0;
    setup.subscribe(topic, 'ordersPlugin.fast', ['default'], () => {
      fastCalls++;
    });

    const { publish } = start(service);
    const publishOne = (value: string) =>
      publish(topic, { namespaces: ['default'], payload: { secret: value } });

    await publishOne('first');
    await flushDispatch();

    for (let index = 0; index < PUBSUB_MAX_PENDING_EVENTS; index++) {
      await publishOne(`queued-${index}`);
      await flushDispatch();
    }

    const dropped = await publishOne(secret);
    await flushDispatch();

    expect(fastCalls).toBe(PUBSUB_MAX_PENDING_EVENTS + 2);
    expect(slowCalls).toBe(1);

    const logged = loggerMock
      .collect(logger)
      .warn.map(([message]) => String(message))
      .join('\n');
    expect(logged).toContain('ordersPlugin.slow');
    expect(logged).toContain(dropped.id);
    expect(logged).not.toContain(secret);

    gate.resolve();
    await flushDispatch();
    expect(slowCalls).toBe(PUBSUB_MAX_PENDING_EVENTS + 1);
  });

  it('does not start a queued handler after stop', async () => {
    const { service, setup, topic } = createHarness();
    let calls = 0;
    const gate = deferred();

    setup.subscribe(topic, 'ordersPlugin.slow', ['default'], async () => {
      calls++;
      if (calls === 1) {
        await gate.promise;
      }
    });

    const { publish } = start(service);
    await publish(topic, { namespaces: ['default'], payload: { secret: 'in-flight' } });
    await flushDispatch();
    await publish(topic, { namespaces: ['default'], payload: { secret: 'queued' } });

    service.stop();
    gate.resolve();
    await flushDispatch();

    expect(calls).toBe(1);
    await expect(
      service.publish(topic, { namespaces: ['default'], payload: { secret: 'late' } })
    ).rejects.toThrow(/after start/);
  });
});

describe('PubSubEvent shape', () => {
  it('assigns an id and acceptedAt and does not replace the payload reference', async () => {
    const service = new PubSubService(mockCoreContext.create());
    const setup = service.setup();
    const topic = defineTopic<{ secret: string }>('orders');
    setup.registerTopic(topic);
    const { publish } = service.start();
    const payload = { secret: 'same' };

    const event = await publish(topic, { namespaces: ['default'], payload });

    expect(event.topic).toBe('orders');
    expect(event.namespaces).toEqual(['default']);
    expect(event.payload).toBe(payload);
    expect(event.id).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(event.acceptedAt))).toBe(false);
    expect(Object.isFrozen(event)).toBe(true);
  });
});
