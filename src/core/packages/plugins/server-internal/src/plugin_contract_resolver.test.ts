/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { isPluginInitializationError } from '@kbn/core-deferred-init-common';
import type { PluginInitStatus } from '@kbn/core-plugins-server';
import { DeferredInitEngine } from './deferred_init';
import { RuntimePluginContractResolver } from './plugin_contract_resolver';

const createEngine = () => new DeferredInitEngine(loggingSystemMock.createLogger());

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
  const dependencyMap = new Map<string, Set<string>>([
    [SOURCE_PLUGIN, new Set(['pluginA', 'pluginB', 'pluginC'])],
  ]);
  let resolver: RuntimePluginContractResolver;

  beforeEach(() => {
    resolver = new RuntimePluginContractResolver();
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

    it('resolves a dependency with an initialize() hook like any other, without waiting for it to initialize', async () => {
      const engine = createEngine();
      engine.register('pluginA');
      resolver.setDeferredInitEngine(engine);
      resolver.resolveStartRequests(toMap({ pluginA: pluginAContract }));

      await expect(resolver.onStart(SOURCE_PLUGIN, ['pluginA'])).resolves.toEqual({
        pluginA: { found: true, contract: pluginAContract },
      });
      expect(engine.getStatus('pluginA')).toEqual({ state: 'idle', attempts: 0 });
    });
  });

  describe('dependency initialization', () => {
    const UNDECLARED_MESSAGE =
      'Dynamic contract resolving requires the dependencies to be declared in the plugin manifest.' +
      'Undeclared dependencies: undeclaredPlugin';
    let engine: DeferredInitEngine;
    let runner: jest.Mock<Promise<void>, []>;

    beforeEach(() => {
      jest.useFakeTimers();
      engine = createEngine();
      runner = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
      // `pluginA` has an `initialize()` hook: `PluginsSystem` registers it at setup and attaches
      // its runner at start.
      engine.register('pluginA');
      engine.setRunner('pluginA', runner);
      resolver.setDeferredInitEngine(engine);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    /** A resolver that knows the dependencies but has no engine attached yet. */
    const createResolverWithoutEngine = () => {
      const bare = new RuntimePluginContractResolver();
      bare.setDependencyMap(dependencyMap);
      return bare;
    };

    /** A resolver with the engine attached but `setDependencyMap` never called. */
    const createResolverWithoutDependencyMap = () => {
      const bare = new RuntimePluginContractResolver();
      bare.setDeferredInitEngine(engine);
      return bare;
    };

    describe('getPluginInitStatus', () => {
      it("reads a declared dependency's status from the engine without running its initialize()", () => {
        expect(resolver.getPluginInitStatus(SOURCE_PLUGIN, 'pluginA')).toEqual({
          state: 'idle',
          attempts: 0,
        });
        expect(runner).not.toHaveBeenCalled();
      });

      it('throws for an undeclared dependency', () => {
        expect(() => resolver.getPluginInitStatus(SOURCE_PLUGIN, 'undeclaredPlugin')).toThrow(
          UNDECLARED_MESSAGE
        );
      });

      it('throws before setDependencyMap', () => {
        expect(() =>
          createResolverWithoutDependencyMap().getPluginInitStatus(SOURCE_PLUGIN, 'pluginA')
        ).toThrow('getPluginInitStatus cannot be called before setDependencyMap');
      });

      it('throws when no engine has been attached', () => {
        expect(() =>
          createResolverWithoutEngine().getPluginInitStatus(SOURCE_PLUGIN, 'pluginA')
        ).toThrow('getPluginInitStatus is not available before plugin setup');
      });
    });

    describe('pluginInitStatus$', () => {
      it("replays the current status and follows the dependency's attempts without running them", async () => {
        const seen: PluginInitStatus[] = [];
        resolver
          .pluginInitStatus$(SOURCE_PLUGIN, 'pluginA')
          .subscribe((status) => seen.push(status));

        expect(seen).toEqual([{ state: 'idle', attempts: 0 }]);
        expect(runner).not.toHaveBeenCalled();

        await engine.initialize('pluginA');

        expect(seen.map(({ state }) => state)).toEqual(['idle', 'initializing', 'available']);
      });

      it('throws for an undeclared dependency', () => {
        expect(() => resolver.pluginInitStatus$(SOURCE_PLUGIN, 'undeclaredPlugin')).toThrow(
          UNDECLARED_MESSAGE
        );
      });

      it('throws before setDependencyMap', () => {
        expect(() =>
          createResolverWithoutDependencyMap().pluginInitStatus$(SOURCE_PLUGIN, 'pluginA')
        ).toThrow('pluginInitStatus$ cannot be called before setDependencyMap');
      });

      it('throws when no engine has been attached', () => {
        expect(() =>
          createResolverWithoutEngine().pluginInitStatus$(SOURCE_PLUGIN, 'pluginA')
        ).toThrow('pluginInitStatus$ is not available before plugin setup');
      });
    });

    describe('initializePlugin', () => {
      it("runs the declared dependency's initialize() through the engine and resolves once it is available", async () => {
        await expect(resolver.initializePlugin(SOURCE_PLUGIN, 'pluginA')).resolves.toBeUndefined();

        expect(runner).toHaveBeenCalledTimes(1);
        expect(engine.getStatus('pluginA')).toEqual({ state: 'available', attempts: 0 });
      });

      it('joins an attempt the engine already has in flight instead of starting another', async () => {
        const inFlight = engine.initialize('pluginA');

        await expect(resolver.initializePlugin(SOURCE_PLUGIN, 'pluginA')).resolves.toBeUndefined();
        await inFlight;

        expect(runner).toHaveBeenCalledTimes(1);
      });

      it("rejects with the engine's PluginInitializationError when the attempt fails", async () => {
        runner.mockRejectedValue(new Error('cluster unavailable'));

        const error: unknown = await resolver.initializePlugin(SOURCE_PLUGIN, 'pluginA').then(
          () => {
            throw new Error('expected a rejection');
          },
          (reason: unknown) => reason
        );

        expect(isPluginInitializationError(error)).toBe(true);
        expect(error).toMatchObject({ pluginId: 'pluginA', status: 'failed' });
      });

      it('rejects for an undeclared dependency without touching the engine', async () => {
        await expect(resolver.initializePlugin(SOURCE_PLUGIN, 'undeclaredPlugin')).rejects.toThrow(
          UNDECLARED_MESSAGE
        );
        expect(runner).not.toHaveBeenCalled();
      });

      it('rejects before setDependencyMap', async () => {
        await expect(
          createResolverWithoutDependencyMap().initializePlugin(SOURCE_PLUGIN, 'pluginA')
        ).rejects.toThrow('initializePlugin cannot be called before setDependencyMap');
      });

      it('rejects when no engine has been attached', async () => {
        await expect(
          createResolverWithoutEngine().initializePlugin(SOURCE_PLUGIN, 'pluginA')
        ).rejects.toThrow('initializePlugin is not available before plugin setup');
      });
    });
  });
});
