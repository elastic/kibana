/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { DeferredInitExampleStartContract } from '@kbn/deferred-init-example-plugin/server';
import { DeferredInitExampleConsumerServerPlugin } from './plugin';

const createPlugin = () =>
  new DeferredInitExampleConsumerServerPlugin(coreMock.createPluginInitializerContext());

// `start()` calls `core.plugins.loadPluginContract` directly -- the pattern
// `PluginsSystem.startPluginWithRetry` retries wholesale on a retriable
// `DeferredInitializationError`. These tests simulate that retry by calling `start()` more than
// once on the same plugin instance, the way core would.
describe('DeferredInitExampleConsumerServerPlugin', () => {
  const dependencyContract: DeferredInitExampleStartContract = {
    getDoc: async () => ({
      message: 'hello',
      greeting: 'hi',
      initializedAt: new Date().toISOString(),
    }),
  };

  it('resolves deferredInitExample from start() and returns its contract', async () => {
    const plugin = createPlugin();
    const core = coreMock.createStart();
    core.plugins.loadPluginContract.mockResolvedValue(dependencyContract);

    await expect(plugin.start(core)).resolves.toEqual({});
    expect(core.plugins.loadPluginContract).toHaveBeenCalledWith('deferredInitExample');
  });

  it('does not re-fetch the contract if start() is called again after already succeeding', async () => {
    const plugin = createPlugin();
    const core = coreMock.createStart();
    core.plugins.loadPluginContract.mockResolvedValue(dependencyContract);

    await plugin.start(core);
    await plugin.start(core);

    // Idempotency guard: a retry that gets this far again must not repeat the fetch.
    expect(core.plugins.loadPluginContract).toHaveBeenCalledTimes(1);
  });

  it('propagates a rejection out of start(), leaving it retriable', async () => {
    const plugin = createPlugin();
    const core = coreMock.createStart();
    const failure = new Error('deferredInitExample contract unavailable');
    core.plugins.loadPluginContract.mockRejectedValueOnce(failure);

    await expect(plugin.start(core)).rejects.toBe(failure);
    expect(core.plugins.loadPluginContract).toHaveBeenCalledTimes(1);
  });

  it('succeeds on a later start() call after an earlier one failed', async () => {
    const plugin = createPlugin();
    const core = coreMock.createStart();
    const failure = new Error('deferredInitExample contract unavailable');
    core.plugins.loadPluginContract
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(dependencyContract);

    await expect(plugin.start(core)).rejects.toBe(failure);
    // Simulates core recalling the whole `start()` function on retry.
    await expect(plugin.start(core)).resolves.toEqual({});
    expect(core.plugins.loadPluginContract).toHaveBeenCalledTimes(2);
  });
});
