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

// `start()` must NOT call `core.plugins.loadPluginContract` for a lazy plugin directly — core's
// start-cycle guard rejects that. Instead it returns a `getDeferredInitExample()` function that
// callers invoke post-boot. These tests exercise that function-in-contract pattern.
describe('DeferredInitExampleConsumerServerPlugin', () => {
  const dependencyContract: DeferredInitExampleStartContract = {
    getDoc: async () => ({
      message: 'hello',
      greeting: 'hi',
      initializedAt: new Date().toISOString(),
    }),
  };

  it('does not call loadPluginContract during start() itself', () => {
    const plugin = createPlugin();
    const core = coreMock.createStart();
    core.plugins.loadPluginContract.mockResolvedValue(dependencyContract);

    plugin.start(core);

    // The whole point of the function-in-contract pattern: nothing is loaded until the returned
    // function is called post-boot.
    expect(core.plugins.loadPluginContract).not.toHaveBeenCalled();
  });

  it('resolves deferredInitExample when the returned function is invoked post-boot', async () => {
    const plugin = createPlugin();
    const core = coreMock.createStart();
    core.plugins.loadPluginContract.mockResolvedValue(dependencyContract);

    const { getDeferredInitExample } = plugin.start(core);
    await expect(getDeferredInitExample()).resolves.toBe(dependencyContract);
    expect(core.plugins.loadPluginContract).toHaveBeenCalledWith('deferredInitExample');
  });

  it('propagates a rejection out of the returned function (e.g. deferred init failed)', async () => {
    const plugin = createPlugin();
    const core = coreMock.createStart();
    const failure = new Error('deferredInitExample contract unavailable');
    core.plugins.loadPluginContract.mockRejectedValueOnce(failure);

    const { getDeferredInitExample } = plugin.start(core);
    await expect(getDeferredInitExample()).rejects.toBe(failure);
  });
});
