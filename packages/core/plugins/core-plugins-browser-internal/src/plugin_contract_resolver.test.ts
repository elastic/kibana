/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  });
});
