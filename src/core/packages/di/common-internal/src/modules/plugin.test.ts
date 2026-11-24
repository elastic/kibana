/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, ContainerModule, inject, injectable, type ServiceIdentifier } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import { loggerMock } from '@kbn/logging-mocks';
import {
  createExtensionPoint,
  ExtensionService,
  KibanaContainerModule,
  type KibanaContainerModuleLoadOptions,
  Logger,
  OnExtensionsReady,
  OnSetup,
  OnStart,
  Setup,
  Start,
} from '@kbn/core-di';
import { Collect, Contributions, ExtensionContribution } from './extensions';
import { Fork, Global, Plugin, PluginModule } from './plugin';

describe('PluginModule', () => {
  const token1 = Symbol.for('token1');
  const token2 = Symbol.for('token2');
  const token3 = Symbol.for('token3');

  let root: Container;

  beforeEach(() => {
    root = new Container();
    root.load(new PluginModule(root));
  });

  describe('Scope', () => {
    it('should create an isolated child container', () => {
      const child = root.get(Plugin)(token1);
      root.bind('something').toConstantValue('value');

      expect(child).toBeInstanceOf(Container);
      expect(child).not.toBe(root);
      expect(child.get('something')).toBe('value');
    });

    it('should return the same child container instance for the same id', () => {
      const child1 = root.get(Plugin)(token1);
      const child2 = root.get(Plugin)(token2);

      expect(root.get(Plugin)(token1)).toBe(child1);
      expect(root.get(Plugin)(token2)).toBe(child2);
    });

    it('should return the current container if no id specified', () => {
      expect(root.get(Plugin)()).toBe(root);
    });

    it('should dispose the child container when the parent is disposed', async () => {
      const child = root.get(Plugin)(token1);
      child.bind('test').toConstantValue('test');
      await root.unbindAllAsync();

      expect(child.isCurrentBound('test')).toBe(false);
    });

    it('should disassociate the child container from the parent when disposed', async () => {
      const child = root.get(Plugin)(token1);
      await child.unbindAllAsync();

      expect(root.get(Plugin)(token1)).not.toBe(child);
    });
  });

  describe('Fork', () => {
    it('should create child container from the parent', () => {
      const fork = root.get(Fork)();
      root.bind('something').toConstantValue('value');

      expect(fork).toBeInstanceOf(Container);
      expect(fork).not.toBe(root);
      expect(fork.get('something')).toBe('value');
    });

    it('should create scoped child container from the parent', () => {
      const child1 = root.get(Plugin)(token1);
      const forkedChild1 = root.get(Fork)(token1);

      root.bind('service1').toConstantValue('value1');
      child1.bind('service2').toConstantValue('value2');

      expect(forkedChild1).toBeInstanceOf(Container);
      expect(forkedChild1).not.toBe(root);
      expect(forkedChild1).not.toBe(child1);

      expect(forkedChild1.get('service1')).toBe('value1');
      expect(forkedChild1.get('service2')).toBe('value2');
    });

    it('should dispose the entire forked scope when deactivating the plugin scope', async () => {
      const child1 = root.get(Plugin)(token2);
      child1.bind('service1').toResolvedValue((service2) => service2, ['service2']);
      child1.bind(Global).toConstantValue('service1');

      const forkedChild2 = root.get(Fork)(token2);
      const forkedChild1 = forkedChild2.get(Plugin)(token1);

      forkedChild1.bind('something').toConstantValue('value');
      forkedChild2.bind('service2').toConstantValue('value2');
      forkedChild2.bind(Global).toConstantValue('service2');

      expect(forkedChild2.get('service1')).toBe('value2');

      await forkedChild2.unbindAllAsync();

      expect(forkedChild1.isBound('something')).toBe(false);
    });
  });

  describe('Global', () => {
    function activate(id: PluginOpaqueId) {
      root.get(Plugin)(id).get(Setup);
    }

    let plugin1: Container;
    let plugin2: Container;

    beforeEach(() => {
      plugin1 = root.get(Plugin)(token1);
      plugin1.bind('service1').toConstantValue('service1');
      plugin1.bind('service2').toConstantValue('service2');
      plugin1.bind(Global).toConstantValue('service1');

      plugin2 = root.get(Plugin)(token2);
      plugin2.bind('service3').toConstantValue('service3.1');
      plugin2.bind('service3').toConstantValue('service3.2');
      plugin2.bind('service4').toConstantValue('service4');
      plugin2.bind(Global).toConstantValue('service3');
      plugin2.bind(Global).toConstantValue('service3');

      activate(token1);
      activate(token2);
    });

    describe('singleton scope', () => {
      it('should bind only global services', () => {
        expect(root.isBound('service1')).toBe(true);
        expect(root.isBound('service2')).toBe(false);
        expect(root.get('service1')).toBe('service1');
      });

      it('should make global services available in the child containers', () => {
        expect(plugin2.isBound('service1')).toBe(true);
        expect(plugin2.isBound('service2')).toBe(false);
        expect(plugin1.isBound('service3')).toBe(true);
        expect(plugin2.get('service1')).toBe('service1');
      });

      it('should bind multiple global services with the same name', () => {
        expect(plugin1.getAll('service3')).toEqual(['service3.1', 'service3.2']);
      });

      it('should allow transitive bindings', () => {
        const plugin3 = root.get(Plugin)(token3);
        plugin3.bind('service5').toService('service1');

        expect(plugin3.get('service5')).toBe('service1');
      });

      it('should inherit services from the parent scope', () => {
        const plugin1Fork = root.get(Fork)(token1);

        expect(plugin1Fork.isBound('service1')).toBe(true);
        expect(plugin1Fork.isBound('service2')).toBe(true);
        expect(plugin1Fork.isBound('service3')).toBe(true);
        expect(plugin1Fork.isBound('service4')).toBe(false);
        expect(plugin1Fork.get('service1')).toBe('service1');
        expect(plugin1Fork.get('service2')).toBe('service2');
        expect(plugin1Fork.getAll('service3')).toEqual(['service3.1', 'service3.2']);
      });
    });

    describe('request scope', () => {
      let plugin2Fork: Container;
      let plugin3: Container;

      beforeEach(() => {
        plugin3 = root.get(Plugin)(token3);
        plugin3
          .bind('service5')
          .toDynamicValue(({ getAll }) => getAll('service6'))
          .inRequestScope();
        plugin3.bind(Global).toConstantValue('service5');

        activate(token3);

        plugin2Fork = root.get(Fork)(token2);
      });

      it('should resolve dependencies from the forked context', () => {
        plugin2Fork.bind('service6').toConstantValue('service6');
        plugin2Fork.bind(Global).toConstantValue('service6');

        expect(plugin2.get('service5')).toEqual([]);
        expect(plugin2Fork.get('service5')).toEqual(['service6']);
      });

      it('should resolve multiple dependencies from the forked context', () => {
        plugin2Fork.bind('service6').toConstantValue('service6.1');
        plugin2Fork.bind('service6').toConstantValue('service6.2');
        plugin2Fork.bind(Global).toConstantValue('service6');
        plugin2Fork.bind(Global).toConstantValue('service6');

        expect(plugin2Fork.get('service5')).toEqual(['service6.1', 'service6.2']);
      });
    });
  });

  describe('extension points', () => {
    const Greeter = createExtensionPoint<string>('test.Greeter');
    const Widget = createExtensionPoint<string>('test.Widget');
    const StartOnly = Symbol.for('StartOnly') as ServiceIdentifier<string>;

    let pluginModule: PluginModule;

    function createPlugin(
      id: PluginOpaqueId,
      load: (options: KibanaContainerModuleLoadOptions) => void = () => {}
    ): Container {
      const plugin = root.get(Plugin)(id);
      plugin.load(new KibanaContainerModule(load));

      return plugin;
    }

    function setupAndStart(...plugins: Container[]): void {
      plugins.forEach((plugin) => plugin.get(Setup));
      plugins.forEach((plugin) => {
        plugin.load(
          new ContainerModule(({ bind }) => {
            bind(StartOnly).toConstantValue('started');
          })
        );
        plugin.get(Start);
      });
    }

    function setupStartAndReady(...plugins: Container[]): void {
      setupAndStart(...plugins);
      pluginModule.ready();
    }

    beforeEach(() => {
      root = new Container();
      pluginModule = new PluginModule(root);
      root.load(pluginModule);
    });

    it('should use the private tokens the public module binds', () => {
      expect(Collect).toBe(Symbol.for('core.di.Collect'));
      expect(Contributions).toBe(Symbol.for('core.di.Contributions'));
      expect(ExtensionContribution).toBe(Symbol.for('core.di.ExtensionContribution'));
    });

    it('should keep a contribution reachable only through ExtensionService', () => {
      const provider = createPlugin(token1, ({ extensions }) => {
        extensions.contribute(Greeter).toConstantValue('hello');
      });
      const consumer = createPlugin(token2);
      setupStartAndReady(provider, consumer);
      const [{ slot }] = provider.getAll(ExtensionContribution);

      expect(consumer.get(ExtensionService).get(Greeter)).toBe('hello');
      expect(consumer.isBound(slot)).toBe(false);
      expect(consumer.isBound(ExtensionContribution)).toBe(false);
      expect(root.isBound(slot)).toBe(false);
      expect(root.isBound(ExtensionContribution)).toBe(false);
      expect(root.get(Fork)(token2).isBound(slot)).toBe(false);
    });

    it('should not resolve the extension point token directly in another plugin', () => {
      @injectable()
      class DirectGreeter {
        constructor(@inject(Greeter) public readonly greeter: string) {}
      }

      const provider = createPlugin(token1, ({ extensions }) => {
        extensions.contribute(Greeter).toConstantValue('hello');
      });
      const consumer = createPlugin(token2, ({ bind }) => {
        bind(DirectGreeter).toSelf();
      });
      const expectNoDirectBinding = () => {
        expect(() => consumer.get(Greeter)).toThrow(/No bindings found/);
        expect(() => consumer.get(DirectGreeter)).toThrow(/No bindings found/);
      };

      [provider, consumer].forEach((plugin) => plugin.get(Setup));
      expectNoDirectBinding();

      setupStartAndReady(provider, consumer);
      expectNoDirectBinding();
      expect(consumer.get(ExtensionService).get(Greeter)).toBe('hello');
    });

    describe('get', () => {
      it('should return the contribution of another plugin', () => {
        const provider = createPlugin(token1, ({ extensions }) => {
          extensions.contribute(Greeter).toConstantValue('hello');
        });
        const consumer = createPlugin(token2);
        setupStartAndReady(provider, consumer);

        expect(consumer.get(ExtensionService).get(Greeter)).toBe('hello');
      });

      it('should return undefined when no plugin contributes', () => {
        const consumer = createPlugin(token2);
        setupStartAndReady(consumer);

        expect(consumer.get(ExtensionService).get(Greeter)).toBeUndefined();
      });

      it('should treat extension points with the same id as the same point', () => {
        const provider = createPlugin(token1, ({ extensions }) => {
          extensions.contribute(createExtensionPoint<string>('test.Greeter')).toConstantValue('hi');
        });
        const consumer = createPlugin(token2);
        setupStartAndReady(provider, consumer);

        expect(consumer.get(ExtensionService).get(Greeter)).toBe('hi');
      });

      it('should resolve a contribution needing start bindings of a provider that starts after the consumer', () => {
        const greetings: Array<string | undefined> = [];
        const consumer = createPlugin(token2, ({ bind }) => {
          bind(OnExtensionsReady).toResolvedValue(
            (extensionService) => () => greetings.push(extensionService.get(Greeter)),
            [ExtensionService]
          );
        });
        const provider = createPlugin(token1, ({ extensions }) => {
          extensions.contribute(Greeter).toResolvedValue((value) => `hello ${value}`, [StartOnly]);
        });
        setupStartAndReady(consumer, provider);

        expect(greetings).toEqual(['hello started']);
      });

      it('should throw until all plugins started', () => {
        const provider = createPlugin(token1, ({ extensions }) => {
          extensions.contribute(Greeter).toConstantValue('hello');
        });
        const consumer = createPlugin(token2);
        setupAndStart(provider, consumer);

        expect(() => consumer.get(ExtensionService).get(Greeter)).toThrow(
          'Cannot resolve extension point "test.Greeter" before all plugins started. Call it in an OnExtensionsReady hook, a request handler, or later.'
        );
      });

      it('should throw when used while the plugin starts', () => {
        const consumer = createPlugin(token2, ({ bind }) => {
          bind(OnStart).toResolvedValue(
            (extensionService) => () => extensionService.get(Greeter),
            [ExtensionService]
          );
        });
        consumer.get(Setup);

        expect(() => consumer.get(Start)).toThrow(/before all plugins started/);
      });

      it('should throw naming the contributing plugins when more than one contribution exists', () => {
        const provider1 = createPlugin(token1, ({ extensions }) => {
          extensions.contribute(Greeter).toConstantValue('hello');
        });
        const provider2 = createPlugin(token2, ({ extensions }) => {
          extensions.contribute(Greeter).toConstantValue('hi');
        });
        setupStartAndReady(provider1, provider2);

        expect(() => provider1.get(ExtensionService).get(Greeter)).toThrow(
          'Cannot get extension point "test.Greeter" because it has 2 contributions, from plugins "token1", "token2". Use getAll or collect instead.'
        );
      });
    });

    describe('getAll', () => {
      it('should return every contribution exactly once', () => {
        const owner = createPlugin(token1, ({ extensions }) => {
          extensions.contribute(Widget).toConstantValue('owner');
        });
        const contributor = createPlugin(token2, ({ extensions }) => {
          extensions.contribute(Widget).toConstantValue('contributor.1');
          extensions.contribute(Widget).toConstantValue('contributor.2');
        });
        setupStartAndReady(owner, contributor);

        expect(owner.get(ExtensionService).getAll(Widget)).toEqual([
          'owner',
          'contributor.1',
          'contributor.2',
        ]);
      });

      it('should return an empty list when no plugin contributes', () => {
        const owner = createPlugin(token1);
        setupStartAndReady(owner);

        expect(owner.get(ExtensionService).getAll(Widget)).toEqual([]);
      });

      it('should return the plugin contributions inside a request fork', () => {
        const owner = createPlugin(token1, ({ extensions }) => {
          extensions.contribute(Widget).toConstantValue('owner');
        });
        const contributor = createPlugin(token2, ({ extensions }) => {
          extensions.contribute(Widget).toConstantValue('contributor');
        });
        setupStartAndReady(owner, contributor);

        expect(root.get(Fork)(token1).get(ExtensionService).getAll(Widget)).toEqual([
          'owner',
          'contributor',
        ]);
      });

      it('should throw until all plugins started', () => {
        const owner = createPlugin(token1);
        setupAndStart(owner);

        expect(() => owner.get(ExtensionService).getAll(Widget)).toThrow(
          'Cannot resolve extension point "test.Widget" before all plugins started. Call it in an OnExtensionsReady hook, a request handler, or later.'
        );
      });

      it('should rethrow a contribution build error naming the point and the plugin', () => {
        const owner = createPlugin(token1);
        createPlugin(token2, ({ extensions }) => {
          extensions.contribute(Widget).toDynamicValue(() => {
            throw new Error('boom');
          });
        });
        setupStartAndReady(owner);

        expect(() => owner.get(ExtensionService).getAll(Widget)).toThrow(
          'Failed to build the "test.Widget" contribution from plugin "token2": boom'
        );
      });
    });

    describe('collect', () => {
      it('should collect contributions from other plugins and the owner exactly once', () => {
        const Registry = Symbol.for('Registry') as ServiceIdentifier<string[]>;
        const owner = createPlugin(token1, ({ bind, extensions }) => {
          bind(Registry).toConstantValue([]);
          extensions.collect(Widget, Registry, (_context, widget, registry) =>
            registry.push(widget)
          );
          extensions.contribute(Widget).toConstantValue('owner');
        });
        const contributor1 = createPlugin(token2, ({ extensions }) => {
          extensions.contribute(Widget).toConstantValue('contributor1');
        });
        const contributor2 = createPlugin(token3, ({ extensions }) => {
          extensions.contribute(Widget).toConstantValue('contributor2');
        });
        setupStartAndReady(contributor1, owner, contributor2);

        expect(owner.get(Registry).sort()).toEqual(['contributor1', 'contributor2', 'owner']);
      });

      it('should collect a contribution needing start bindings of a contributor that starts after the owner', () => {
        const handler = jest.fn();
        const owner = createPlugin(token1, ({ extensions }) => {
          extensions.collect(Widget, handler);
        });
        const contributor = createPlugin(token2, ({ extensions }) => {
          extensions
            .contribute(Widget)
            .toResolvedValue((value) => `contributor ${value}`, [StartOnly]);
        });
        setupStartAndReady(owner, contributor);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(expect.anything(), 'contributor started');
      });

      it('should collect once when the start contract is resolved again in a fork', () => {
        const handler = jest.fn();
        const owner = createPlugin(token1, ({ extensions }) => {
          extensions.collect(Widget, handler);
          extensions.contribute(Widget).toConstantValue('owner');
        });
        setupStartAndReady(owner);
        root.get(Fork)(token1).get(Start);
        pluginModule.ready();

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should not call the handler when there are no contributions', () => {
        const handler = jest.fn();
        const owner = createPlugin(token1, ({ extensions }) => {
          extensions.collect(Widget, handler);
        });
        setupStartAndReady(owner);

        expect(handler).not.toHaveBeenCalled();
      });

      it('should not collect contributions before all plugins started', () => {
        const handler = jest.fn();
        const owner = createPlugin(token1, ({ extensions }) => {
          extensions.collect(Widget, handler);
        });
        const contributor = createPlugin(token2, ({ extensions }) => {
          extensions.contribute(Widget).toConstantValue('contributor');
        });
        setupAndStart(owner, contributor);

        expect(handler).not.toHaveBeenCalled();
      });

      it('should run every collect handler before any OnExtensionsReady hook', () => {
        const Registry = createExtensionPoint<string[]>('test.Registry');
        const seen: string[][] = [];
        const consumer = createPlugin(token1, ({ bind }) => {
          bind(OnExtensionsReady).toResolvedValue(
            (extensionService) => () => seen.push([...(extensionService.get(Registry) ?? [])]),
            [ExtensionService]
          );
        });
        const owner = createPlugin(token2, ({ extensions }) => {
          const registry: string[] = [];
          extensions.contribute(Registry).toConstantValue(registry);
          extensions.collect(Widget, (_context, widget) => registry.push(widget));
        });
        const contributor = createPlugin(token3, ({ extensions }) => {
          extensions.contribute(Widget).toConstantValue('contributor');
        });
        setupStartAndReady(consumer, owner, contributor);

        expect(seen).toEqual([['contributor']]);
      });

      it('should skip and log each contribution that fails to build and pass the others', () => {
        const handler = jest.fn();
        const logger = loggerMock.create();
        const owner = createPlugin(token1, ({ bind, extensions }) => {
          bind(Logger).toConstantValue(logger);
          extensions.collect(Widget, handler);
        });
        const contributor = createPlugin(token2, ({ extensions }) => {
          extensions.contribute(Widget).toDynamicValue(() => {
            throw new Error('boom');
          });
          extensions.contribute(Widget).toConstantValue('healthy');
        });
        setupStartAndReady(owner, contributor);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(expect.anything(), 'healthy');
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          'Skipped the "test.Widget" contribution from plugin "token2" because it failed to build: boom'
        );
      });
    });
  });

  describe('OnExtensionsReady', () => {
    let pluginModule: PluginModule;

    beforeEach(() => {
      root = new Container();
      pluginModule = new PluginModule(root);
      root.load(pluginModule);
    });

    it('should call the hooks of every plugin with its scope once when ready', () => {
      const plugin1 = root.get(Plugin)(token1);
      const plugin2 = root.get(Plugin)(token2);
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      plugin1.bind(OnExtensionsReady).toConstantValue(handler1);
      plugin2.bind(OnExtensionsReady).toConstantValue(handler2);
      plugin1.get(Start);
      plugin2.get(Start);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();

      pluginModule.ready();
      pluginModule.ready();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith(plugin1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith(plugin2);
    });

    it('should not call the hooks bound in the root or in a forked scope', () => {
      root.get(Plugin)(token1);
      const rootHandler = jest.fn();
      const forkHandler = jest.fn();
      root.bind(OnExtensionsReady).toConstantValue(rootHandler);
      root.get(Fork)(token1).bind(OnExtensionsReady).toConstantValue(forkHandler);

      pluginModule.ready();

      expect(rootHandler).not.toHaveBeenCalled();
      expect(forkHandler).not.toHaveBeenCalled();
    });
  });

  describe.each`
    name       | token    | hook
    ${'Setup'} | ${Setup} | ${OnSetup}
    ${'Start'} | ${Start} | ${OnStart}
  `('$name', ({ hook, token }) => {
    let plugin: Container;

    beforeEach(() => {
      plugin = root.get(Plugin)(token1);
      plugin.bind('service1').toConstantValue('service1');
      plugin.bind('service2').toConstantValue('service2');
    });

    it('should return the default contract', () => {
      expect(plugin.isBound(token)).toBe(true);
      expect(plugin.get(token)).toBeUndefined();
    });

    it('should return the plugin contract', () => {
      plugin
        .bind(token)
        .toResolvedValue((svc1, svc2) => ({ svc1, svc2 }), ['service1', 'service2'])
        .inSingletonScope();

      expect(plugin.isBound(token)).toBe(true);
      expect(plugin.get(token)).toEqual({
        svc1: 'service1',
        svc2: 'service2',
      });
    });

    it('should call the related hook functions', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      plugin.bind(hook).toConstantValue(handler1);
      plugin.bind(hook).toConstantValue(handler2);
      plugin.get(token);

      expect(handler1).toHaveBeenCalledWith(plugin);
      expect(handler2).toHaveBeenCalledWith(plugin);
    });

    it('should call the hook function from the parent scope', () => {
      let lastCalled = '';
      const handler1 = jest.fn(() => {
        lastCalled = 'handler1';
      });
      const handler2 = jest.fn(() => {
        lastCalled = 'handler2';
      });

      root.bind(hook).toConstantValue(handler1);
      plugin.bind(hook).toConstantValue(handler2);
      plugin.get(token);

      expect(handler1).toHaveBeenCalledWith(plugin);
      expect(handler2).toHaveBeenCalledWith(plugin);
      expect(lastCalled).toBe('handler1');
    });

    it('should call the hook function only once per scope', () => {
      const plugin2 = root.get(Plugin)(token2);
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      root.bind(hook).toConstantValue(handler1);
      plugin.bind(hook).toConstantValue(handler2);
      plugin2.bind(hook).toConstantValue(handler3);

      plugin.get(token);
      plugin.get(token);
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).not.toHaveBeenCalled();
      expect(handler1).toHaveBeenCalledWith(plugin);
      expect(handler2).toHaveBeenCalledWith(plugin);

      plugin2.get(token);
      plugin2.get(token);
      expect(handler1).toHaveBeenCalledTimes(2);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith(plugin2);
      expect(handler3).toHaveBeenCalledWith(plugin2);
    });
  });
});
