/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeferredInitEngine } from './deferred_init';
import { RuntimePluginContractResolver } from './plugin_contract_resolver';

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 1));
const fewTicks = () =>
  nextTick()
    .then(() => nextTick())
    .then(() => nextTick());

const toMap = (record: Record<string, unknown>): Map<string, unknown> => {
  return new Map(Object.entries(record));
};

const pluginAContract = Symbol();

describe('RuntimePluginContractResolver', () => {
  const SOURCE_PLUGIN = 'sourcePlugin';
  let resolver: RuntimePluginContractResolver;

  beforeEach(() => {
    resolver = new RuntimePluginContractResolver();

    const dependencyMap = new Map<string, Set<string>>();
    dependencyMap.set(SOURCE_PLUGIN, new Set(['pluginA', 'pluginB', 'pluginC']));
    resolver.setDependencyMap(dependencyMap);
  });

  describe('setup contracts', () => {
    it('throws if onSetup is called before setDependencyMap', () => {
      resolver = new RuntimePluginContractResolver();

      expect(() => resolver.onSetup(SOURCE_PLUGIN, ['pluginA'])).toThrowErrorMatchingInlineSnapshot(
        `"onSetup cannot be called before setDependencyMap"`
      );
    });

    it('throws if resolveSetupRequests is called multiple times', async () => {
      resolver.resolveSetupRequests(
        toMap({
          pluginA: pluginAContract,
        })
      );

      expect(() =>
        resolver.resolveSetupRequests(
          toMap({
            pluginA: pluginAContract,
          })
        )
      ).toThrowErrorMatchingInlineSnapshot(`"resolveSetupRequests can only be called once"`);
    });

    it('resolves a single request', async () => {
      const handler = jest.fn();
      resolver.onSetup(SOURCE_PLUGIN, ['pluginA']).then((contracts) => handler(contracts));

      await fewTicks();

      expect(handler).not.toHaveBeenCalled();

      resolver.resolveSetupRequests(
        toMap({
          pluginA: pluginAContract,
        })
      );

      await fewTicks();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        pluginA: {
          found: true,
          contract: pluginAContract,
        },
      });
    });

    it('resolves multiple requests', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      resolver.onSetup(SOURCE_PLUGIN, ['pluginA']).then((contracts) => handler1(contracts));
      resolver.onSetup(SOURCE_PLUGIN, ['pluginB']).then((contracts) => handler2(contracts));
      resolver
        .onSetup(SOURCE_PLUGIN, ['pluginA', 'pluginB'])
        .then((contracts) => handler3(contracts));

      await fewTicks();

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();

      resolver.resolveSetupRequests(
        toMap({
          pluginA: pluginAContract,
        })
      );

      await fewTicks();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith({
        pluginA: {
          found: true,
          contract: pluginAContract,
        },
      });

      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith({
        pluginB: {
          found: false,
        },
      });

      expect(handler3).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledWith({
        pluginA: {
          found: true,
          contract: pluginAContract,
        },
        pluginB: {
          found: false,
        },
      });
    });

    it('resolves requests instantly when called after resolveSetupRequests', async () => {
      resolver.resolveSetupRequests(
        toMap({
          pluginA: pluginAContract,
        })
      );

      const handler1 = jest.fn();
      const handler2 = jest.fn();
      resolver.onSetup(SOURCE_PLUGIN, ['pluginA']).then((contracts) => handler1(contracts));
      resolver.onSetup(SOURCE_PLUGIN, ['pluginB']).then((contracts) => handler2(contracts));

      await fewTicks();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith({
        pluginA: {
          found: true,
          contract: pluginAContract,
        },
      });

      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith({
        pluginB: {
          found: false,
        },
      });
    });

    it('throws when requesting a contract not defined in the dependency map', async () => {
      expect(() =>
        resolver.onSetup(SOURCE_PLUGIN, ['undeclaredPlugin'])
      ).toThrowErrorMatchingInlineSnapshot(
        `"Dynamic contract resolving requires the dependencies to be declared in the plugin manifest.Undeclared dependencies: undeclaredPlugin"`
      );
    });

    it('throws when requesting a mixed defined/undefined dependencies', async () => {
      expect(() =>
        resolver.onSetup(SOURCE_PLUGIN, [
          'pluginA',
          'undeclaredPlugin1',
          'pluginB',
          'undeclaredPlugin2',
        ])
      ).toThrowErrorMatchingInlineSnapshot(
        `"Dynamic contract resolving requires the dependencies to be declared in the plugin manifest.Undeclared dependencies: undeclaredPlugin1, undeclaredPlugin2"`
      );
    });
  });

  describe('start contracts', () => {
    it('throws if onStart is called before setDependencyMap', () => {
      resolver = new RuntimePluginContractResolver();

      expect(() => resolver.onStart(SOURCE_PLUGIN, ['pluginA'])).toThrowErrorMatchingInlineSnapshot(
        `"onStart cannot be called before setDependencyMap"`
      );
    });

    it('throws if resolveStartRequests is called multiple times', async () => {
      resolver.resolveStartRequests(
        toMap({
          pluginA: pluginAContract,
        })
      );

      expect(() =>
        resolver.resolveStartRequests(
          toMap({
            pluginA: pluginAContract,
          })
        )
      ).toThrowErrorMatchingInlineSnapshot(`"resolveStartRequests can only be called once"`);
    });

    it('resolves a single request', async () => {
      const handler = jest.fn();
      resolver.onStart(SOURCE_PLUGIN, ['pluginA']).then((contracts) => handler(contracts));

      await fewTicks();

      expect(handler).not.toHaveBeenCalled();

      resolver.resolveStartRequests(
        toMap({
          pluginA: pluginAContract,
        })
      );

      await fewTicks();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        pluginA: {
          found: true,
          contract: pluginAContract,
        },
      });
    });

    it('resolves multiple requests', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      resolver.onStart(SOURCE_PLUGIN, ['pluginA']).then((contracts) => handler1(contracts));
      resolver.onStart(SOURCE_PLUGIN, ['pluginB']).then((contracts) => handler2(contracts));
      resolver
        .onStart(SOURCE_PLUGIN, ['pluginA', 'pluginB'])
        .then((contracts) => handler3(contracts));

      await fewTicks();

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();

      resolver.resolveStartRequests(
        toMap({
          pluginA: pluginAContract,
        })
      );

      await fewTicks();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith({
        pluginA: {
          found: true,
          contract: pluginAContract,
        },
      });

      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith({
        pluginB: {
          found: false,
        },
      });

      expect(handler3).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledWith({
        pluginA: {
          found: true,
          contract: pluginAContract,
        },
        pluginB: {
          found: false,
        },
      });
    });

    it('resolves requests instantly when called after resolveSetupRequests', async () => {
      resolver.resolveStartRequests(
        toMap({
          pluginA: pluginAContract,
        })
      );

      const handler1 = jest.fn();
      const handler2 = jest.fn();
      resolver.onStart(SOURCE_PLUGIN, ['pluginA']).then((contracts) => handler1(contracts));
      resolver.onStart(SOURCE_PLUGIN, ['pluginB']).then((contracts) => handler2(contracts));

      await fewTicks();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith({
        pluginA: {
          found: true,
          contract: pluginAContract,
        },
      });

      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith({
        pluginB: {
          found: false,
        },
      });
    });

    it('throws when requesting a contract not defined in the dependency map', async () => {
      expect(() =>
        resolver.onStart(SOURCE_PLUGIN, ['undeclaredPlugin'])
      ).toThrowErrorMatchingInlineSnapshot(
        `"Dynamic contract resolving requires the dependencies to be declared in the plugin manifest.Undeclared dependencies: undeclaredPlugin"`
      );
    });

    it('throws when requesting a mixed defined/undefined dependencies', async () => {
      expect(() =>
        resolver.onStart(SOURCE_PLUGIN, [
          'pluginA',
          'undeclaredPlugin1',
          'pluginB',
          'undeclaredPlugin2',
        ])
      ).toThrowErrorMatchingInlineSnapshot(
        `"Dynamic contract resolving requires the dependencies to be declared in the plugin manifest.Undeclared dependencies: undeclaredPlugin1, undeclaredPlugin2"`
      );
    });

    describe('notifyStartContractAvailable', () => {
      it('resolves a request as soon as its dependency becomes available, before resolveStartRequests', async () => {
        const handler = jest.fn();
        resolver.onStart(SOURCE_PLUGIN, ['pluginA']).then((contracts) => handler(contracts));

        await fewTicks();
        expect(handler).not.toHaveBeenCalled();

        // Simulates the mid-loop notification `PluginsSystem.startPlugins` sends right after
        // `pluginA`'s own `start()` returns -- notably, *before* the whole loop (and therefore
        // `resolveStartRequests`) has finished. Without this, a plugin awaiting `pluginA`'s
        // contract from inside its own `start()` would deadlock.
        resolver.notifyStartContractAvailable('pluginA', pluginAContract);
        await fewTicks();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith({
          pluginA: { found: true, contract: pluginAContract },
        });
      });

      it('only resolves a multi-dependency request once every dependency has been notified', async () => {
        const handler = jest.fn();
        resolver
          .onStart(SOURCE_PLUGIN, ['pluginA', 'pluginB'])
          .then((contracts) => handler(contracts));

        resolver.notifyStartContractAvailable('pluginA', pluginAContract);
        await fewTicks();
        expect(handler).not.toHaveBeenCalled();

        const pluginBContract = Symbol();
        resolver.notifyStartContractAvailable('pluginB', pluginBContract);
        await fewTicks();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith({
          pluginA: { found: true, contract: pluginAContract },
          pluginB: { found: true, contract: pluginBContract },
        });
      });

      it('leaves a request pending for resolveStartRequests to close out when its dependency never starts', async () => {
        const handler = jest.fn();
        resolver
          .onStart(SOURCE_PLUGIN, ['pluginA', 'pluginC'])
          .then((contracts) => handler(contracts));

        // pluginA starts; pluginC is disabled/missing and will never be notified.
        resolver.notifyStartContractAvailable('pluginA', pluginAContract);
        await fewTicks();
        expect(handler).not.toHaveBeenCalled();

        resolver.resolveStartRequests(toMap({ pluginA: pluginAContract }));
        await fewTicks();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith({
          pluginA: { found: true, contract: pluginAContract },
          pluginC: { found: false },
        });
      });

      it('does not resolve a since-satisfied request a second time when resolveStartRequests runs', async () => {
        const handler = jest.fn();
        resolver.onStart(SOURCE_PLUGIN, ['pluginA']).then((contracts) => handler(contracts));

        resolver.notifyStartContractAvailable('pluginA', pluginAContract);
        await fewTicks();
        expect(handler).toHaveBeenCalledTimes(1);

        resolver.resolveStartRequests(toMap({ pluginA: pluginAContract }));
        await fewTicks();

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('loadPluginContract', () => {
    const createEngineMock = (): jest.Mocked<DeferredInitEngine> =>
      ({
        isRegistered: jest.fn(),
        waitUntilAvailable: jest.fn(),
      } as unknown as jest.Mocked<DeferredInitEngine>);

    it('resolves with the contract once found, without an engine attached', async () => {
      resolver.resolveStartRequests(toMap({ pluginA: pluginAContract }));

      await expect(resolver.loadPluginContract(SOURCE_PLUGIN, 'pluginA')).resolves.toBe(
        pluginAContract
      );
    });

    it('throws when the dependency contract is not found', async () => {
      resolver.resolveStartRequests(toMap({}));

      await expect(resolver.loadPluginContract(SOURCE_PLUGIN, 'pluginA')).rejects.toThrow(
        'Cannot load contract for plugin "pluginA": it is missing, disabled, or has no start contract.'
      );
    });

    it('does not wait on the engine when the dependency is not registered as lazy-init', async () => {
      const engine = createEngineMock();
      engine.isRegistered.mockReturnValue(false);
      resolver.setDeferredInitEngine(engine);
      resolver.resolveStartRequests(toMap({ pluginA: pluginAContract }));

      await expect(resolver.loadPluginContract(SOURCE_PLUGIN, 'pluginA')).resolves.toBe(
        pluginAContract
      );
      expect(engine.waitUntilAvailable).not.toHaveBeenCalled();
    });

    it('waits on the engine when the dependency is registered as lazy-init', async () => {
      const engine = createEngineMock();
      engine.isRegistered.mockReturnValue(true);
      engine.waitUntilAvailable.mockResolvedValue(undefined);
      resolver.setDeferredInitEngine(engine);
      resolver.resolveStartRequests(toMap({ pluginA: pluginAContract }));

      await expect(resolver.loadPluginContract(SOURCE_PLUGIN, 'pluginA')).resolves.toBe(
        pluginAContract
      );
      expect(engine.waitUntilAvailable).toHaveBeenCalledWith('pluginA', {
        type: 'contract',
        callerPlugin: SOURCE_PLUGIN,
      });
    });

    it('rejects if the engine ultimately fails to become available', async () => {
      const engine = createEngineMock();
      engine.isRegistered.mockReturnValue(true);
      const deferredInitError = new Error('deferred init failed');
      engine.waitUntilAvailable.mockRejectedValue(deferredInitError);
      resolver.setDeferredInitEngine(engine);
      resolver.resolveStartRequests(toMap({ pluginA: pluginAContract }));

      await expect(resolver.loadPluginContract(SOURCE_PLUGIN, 'pluginA')).rejects.toBe(
        deferredInitError
      );
    });

    it('resolves once the dependency is notified, without waiting for resolveStartRequests', async () => {
      // Regression test for a deadlock: a plugin calling `loadPluginContract` on an
      // already-started dependency from inside its OWN `start()` must not have to wait for
      // `resolveStartRequests`, since that's only called after the whole `startPlugins` loop --
      // including this very `start()` call -- has finished.
      const handler = jest.fn();
      resolver.loadPluginContract(SOURCE_PLUGIN, 'pluginA').then(handler);

      await fewTicks();
      expect(handler).not.toHaveBeenCalled();

      resolver.notifyStartContractAvailable('pluginA', pluginAContract);
      await fewTicks();

      expect(handler).toHaveBeenCalledWith(pluginAContract);
    });
  });
});
