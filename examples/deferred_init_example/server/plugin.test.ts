/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LazyInitContext } from '@kbn/core/server';
import {
  coreMock,
  elasticsearchServiceMock,
  savedObjectsRepositoryMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { DeferredInitExampleDependencyStartContract } from '@kbn/deferred-init-example-dependency-plugin/server';
import { DeferredInitExampleServerPlugin } from './plugin';
import type { DeferredInitExampleConfig } from './config';

const createLazyInitContext = (): LazyInitContext => ({
  elasticsearch: { client: elasticsearchServiceMock.createElasticsearchClient() },
  savedObjects: savedObjectsRepositoryMock.create(),
  logger: loggingSystemMock.create().get(),
});

const createPlugin = (
  config: DeferredInitExampleConfig = { initDelayMs: 0, forceFailure: false }
) => new DeferredInitExampleServerPlugin(coreMock.createPluginInitializerContext(config));

// `lazyInitialize` receives a `LazyInitContext` with no `core`/`plugins` field, so it can only
// reach `core.plugins.loadPluginContract` for another plugin's start contract because `start()`
// captured `core: CoreStart` on `this` first. This is the pattern Fleet will need for its own
// `lazyInitialize` (which has to resolve `licensing`), and this is its first real exercise
// anywhere in the codebase — the only other `loadPluginContract` caller,
// `deferred_init_example_consumer`, calls it from a route handler rather than from a plugin's own
// `lazyInitialize`.
describe('DeferredInitExampleServerPlugin', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads deferredInitExampleDependency start contract from inside lazyInitialize via core captured in start()', async () => {
    const plugin = createPlugin();
    const core = coreMock.createStart();
    const dependencyContract: DeferredInitExampleDependencyStartContract = {
      getGreeting: () => 'hello from the mock dependency',
    };
    core.plugins.loadPluginContract.mockResolvedValue(dependencyContract);

    plugin.start(core);

    const ctx = createLazyInitContext();
    const lazyInitializePromise = plugin.lazyInitialize(ctx);
    await jest.runAllTimersAsync();
    await lazyInitializePromise;

    expect(core.plugins.loadPluginContract).toHaveBeenCalledWith('deferredInitExampleDependency');
    expect(ctx.elasticsearch.client.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({ greeting: 'hello from the mock dependency' }),
      })
    );
  });

  // The accessor asserts rather than reporting readiness: no legitimate caller can observe the
  // state unset, so an unwarmed read is a bug to surface, not a state to poll through.
  it('refuses to serve instance state before lazyInitialize has run on this instance', () => {
    const contract = createPlugin().start(coreMock.createStart());

    expect(() => contract.getInstanceState()).toThrow(/lazyInitialize has not completed/);
  });

  // Deferred init runs once per instance, so `lazyInitialize` can warm in-memory plugin state and
  // the start contract can expose it synchronously. The previous lock + shared-state-document
  // design let an instance reach `available` without ever running `lazyInitialize`, which made
  // exactly this unsafe.
  it('warms instance-local state that the start contract exposes synchronously', async () => {
    const plugin = createPlugin();
    const core = coreMock.createStart();
    core.plugins.loadPluginContract.mockResolvedValue({
      getGreeting: () => 'hello from the mock dependency',
    } as DeferredInitExampleDependencyStartContract);

    const contract = plugin.start(core);
    const lazyInitializePromise = plugin.lazyInitialize(createLazyInitContext());
    await jest.runAllTimersAsync();
    await lazyInitializePromise;

    expect(contract.getInstanceState()).toEqual({
      instanceUuid: 'instance-uuid',
      initializedAt: expect.any(String),
      completedPhases: [
        'savedObjectMigrations',
        'defaultState',
        'loadedDependencyContract',
        'wroteDefaultDocument',
      ],
    });
  });

  it('leaves the instance state unwarmed when the run fails', async () => {
    const plugin = createPlugin({ initDelayMs: 0, forceFailure: true });
    const core = coreMock.createStart();

    const contract = plugin.start(core);
    const lazyInitializePromise = plugin.lazyInitialize(createLazyInitContext());
    const rejection = expect(lazyInitializePromise).rejects.toThrow(/forced failure/);
    await jest.runAllTimersAsync();
    await rejection;

    // The state is published in one shot at the very end of the run, so a failed attempt leaves
    // no partially-warmed state behind for core's retry to trip over.
    expect(() => contract.getInstanceState()).toThrow(/lazyInitialize has not completed/);
  });

  it('propagates a loadPluginContract rejection out of lazyInitialize without writing the document', async () => {
    const plugin = createPlugin();
    const core = coreMock.createStart();
    const failure = new Error('deferredInitExampleDependency contract unavailable');
    core.plugins.loadPluginContract.mockRejectedValue(failure);

    plugin.start(core);

    const ctx = createLazyInitContext();
    const lazyInitializePromise = plugin.lazyInitialize(ctx);
    // Attach the rejection assertion before advancing timers so the promise is never briefly
    // unhandled (which Jest/Node treats as a fatal warning).
    const rejection = expect(lazyInitializePromise).rejects.toBe(failure);
    await jest.runAllTimersAsync();
    await rejection;

    expect(ctx.elasticsearch.client.index).not.toHaveBeenCalled();
  });
});
