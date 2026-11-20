/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { defineTopic } from '@kbn/core-pubsub-server';
import type { PubSubDurableDelegate, Topic } from '@kbn/core-pubsub-server';
import { PubSubService } from './pubsub_service';

interface Data {
  readonly n: number;
}

type DurableTopic = Topic<Data, 'test.durable'>;
const topic = defineTopic<DurableTopic>('test.durable');

const createDelegate = () => {
  const delegate: jest.Mocked<PubSubDurableDelegate> = {
    onSubscribe: jest.fn(),
    append: jest.fn().mockResolvedValue(undefined),
  };
  return delegate;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('PubSubService durable delivery', () => {
  it.each([
    ['delegate before subscription', true],
    ['subscription before delegate', false],
  ])('hands a durable subscription to the delegate: %s', (_name, delegateFirst) => {
    const service = new PubSubService(mockCoreContext.create());
    const setup = service.setup();
    const delegate = createDelegate();
    setup.registerTopic('owner', topic);

    if (delegateFirst) setup.registerDurableDelegate(delegate);
    setup.subscribe('plugin', topic, { consumer: 'c', handler: jest.fn(), delivery: 'durable' });
    if (!delegateFirst) setup.registerDurableDelegate(delegate);

    expect(delegate.onSubscribe).toHaveBeenCalledTimes(1);
    expect(delegate.onSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'test.durable', consumer: 'plugin.c' })
    );
  });

  it('does not hand in-process subscriptions to the delegate', () => {
    const service = new PubSubService(mockCoreContext.create());
    const setup = service.setup();
    const delegate = createDelegate();
    setup.registerDurableDelegate(delegate);
    setup.registerTopic('owner', topic);
    setup.subscribe('plugin', topic, { consumer: 'c', handler: jest.fn() });

    expect(delegate.onSubscribe).not.toHaveBeenCalled();
  });

  it('rejects a second delegate and registration after setup', () => {
    const service = new PubSubService(mockCoreContext.create());
    const setup = service.setup();
    setup.registerDurableDelegate(createDelegate());
    expect(() => setup.registerDurableDelegate(createDelegate())).toThrow(/already registered/);

    service.start();
    expect(() => setup.registerDurableDelegate(createDelegate())).toThrow(/outside of setup/);
  });

  it('awaits append on publish and keeps durable handlers off the in-memory queue', async () => {
    const service = new PubSubService(mockCoreContext.create());
    const setup = service.setup();
    const delegate = createDelegate();
    const durableHandler = jest.fn();
    const localHandler = jest.fn();
    setup.registerTopic('owner', topic);
    setup.registerDurableDelegate(delegate);
    setup.subscribe('plugin', topic, {
      consumer: 'd',
      handler: durableHandler,
      delivery: 'durable',
    });
    setup.subscribe('plugin', topic, { consumer: 'l', handler: localHandler });
    const start = service.start();

    let resolveAppend: () => void = () => {};
    delegate.append.mockReturnValueOnce(new Promise<void>((resolve) => (resolveAppend = resolve)));

    let resolved = false;
    const publishing = start
      .publish('owner', topic, { id: 'e1', data: { n: 1 } })
      .then(() => (resolved = true));
    await flush();
    expect(resolved).toBe(false);
    expect(localHandler).not.toHaveBeenCalled();

    resolveAppend();
    await publishing;
    await flush();

    expect(delegate.append).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1', topic: 'test.durable', serializedData: '{"n":1}' })
    );
    expect(localHandler).toHaveBeenCalledTimes(1);
    expect(durableHandler).not.toHaveBeenCalled();
  });

  it('rejects publish and enqueues nothing when append fails', async () => {
    const service = new PubSubService(mockCoreContext.create());
    const setup = service.setup();
    const delegate = createDelegate();
    const localHandler = jest.fn();
    setup.registerTopic('owner', topic);
    setup.registerDurableDelegate(delegate);
    setup.subscribe('plugin', topic, { consumer: 'd', handler: jest.fn(), delivery: 'durable' });
    setup.subscribe('plugin', topic, { consumer: 'l', handler: localHandler });
    const start = service.start();
    delegate.append.mockRejectedValueOnce(new Error('write failed'));

    await expect(start.publish('owner', topic, { id: 'e1', data: { n: 1 } })).rejects.toThrow(
      'write failed'
    );
    await flush();
    expect(localHandler).not.toHaveBeenCalled();
  });

  it('does not call append for topics without durable subscriptions', async () => {
    const service = new PubSubService(mockCoreContext.create());
    const setup = service.setup();
    const delegate = createDelegate();
    setup.registerTopic('owner', topic);
    setup.registerDurableDelegate(delegate);
    setup.subscribe('plugin', topic, { consumer: 'l', handler: jest.fn() });
    const start = service.start();

    await start.publish('owner', topic, { id: 'e1', data: { n: 1 } });
    expect(delegate.append).not.toHaveBeenCalled();
  });

  it('deliver runs the handler and propagates its failure', async () => {
    const service = new PubSubService(mockCoreContext.create());
    const setup = service.setup();
    const delegate = createDelegate();
    const handler = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    setup.registerTopic('owner', topic);
    setup.registerDurableDelegate(delegate);
    setup.subscribe('plugin', topic, { consumer: 'd', handler, delivery: 'durable' });
    service.start();

    const [{ deliver }] = delegate.onSubscribe.mock.calls[0];
    const event = { id: 'e1', topic: 'test.durable', acceptedAt: 'now', data: { n: 1 } };

    await expect(deliver(event)).rejects.toThrow('boom');
    await expect(deliver(event)).resolves.toBeUndefined();
    expect(Object.isFrozen(handler.mock.calls[1][0])).toBe(true);
  });

  it('serves durable subscriptions in process, with one warning, when no delegate registers', async () => {
    const coreContext = mockCoreContext.create();
    const service = new PubSubService(coreContext);
    const setup = service.setup();
    const handler = jest.fn();
    setup.registerTopic('owner', topic);
    setup.subscribe('plugin', topic, { consumer: 'd', handler, delivery: 'durable' });
    const start = service.start();

    const warnings = (coreContext.logger.get('pubsub') as any).warn.mock.calls;
    expect(warnings).toHaveLength(1);
    expect(warnings[0][0]).toContain('plugin.d');

    await start.publish('owner', topic, { id: 'e1', data: { n: 1 } });
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
