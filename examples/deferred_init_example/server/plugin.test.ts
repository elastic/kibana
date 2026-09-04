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
// captured `core: CoreStart` on `this` first. This is the pattern
// `docs/specs/2026-07-13-fleet-lazy-init-licensing-contract.md` proposes for Fleet's own
// `lazyInitialize`; this is its first real exercise anywhere in the codebase (the only prior
// `loadPluginContract` caller, `deferred_init_example_consumer`, calls it from a route handler,
// not from a plugin's own `lazyInitialize`).
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
