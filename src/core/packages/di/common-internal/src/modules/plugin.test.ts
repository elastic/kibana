/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, type ServiceIdentifier } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import {
  KibanaContainerModule,
  type KibanaContainerModuleLoadOptions,
  OnSetup,
  OnStart,
  Setup,
  SoftDependencies,
  Start,
} from '@kbn/core-di';
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

  describe('SoftDependencies', () => {
    const Greeter = Symbol.for('Greeter') as ServiceIdentifier<string>;
    const Widget = Symbol.for('Widget') as ServiceIdentifier<string>;

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
      pluginModule.start();
      plugins.forEach((plugin) => plugin.get(Start));
    }

    beforeEach(() => {
      root = new Container();
      pluginModule = new PluginModule(root);
      root.load(pluginModule);
    });

    describe('get', () => {
      it('should return the service exposed by another plugin', () => {
        const provider = createPlugin(token1, ({ expose }) => {
          expose(Greeter).toConstantValue('hello');
        });
        const consumer = createPlugin(token2);
        setupAndStart(provider, consumer);

        expect(consumer.get(SoftDependencies).get(Greeter)).toBe('hello');
      });

      it('should return undefined when no plugin exposes the service', () => {
        const consumer = createPlugin(token2);
        setupAndStart(consumer);

        expect(consumer.get(SoftDependencies).get(Greeter)).toBeUndefined();
      });

      it('should not return a service that is bound but not exposed', () => {
        const provider = createPlugin(token1, ({ bind }) => {
          bind(Greeter).toConstantValue('hello');
        });
        const consumer = createPlugin(token2);
        setupAndStart(provider, consumer);

        expect(consumer.get(SoftDependencies).get(Greeter)).toBeUndefined();
      });

      it('should resolve the service when the consumer was set up before the provider', () => {
        const consumer = createPlugin(token2);
        const provider = createPlugin(token1, ({ expose }) => {
          expose(Greeter).toConstantValue('hello');
        });
        const softDependencies = consumer.get(SoftDependencies);
        setupAndStart(consumer, provider);

        expect(softDependencies.get(Greeter)).toBe('hello');
      });

      it('should throw before all plugins finished setup', () => {
        const consumer = createPlugin(token2);
        consumer.get(Setup);

        expect(() => consumer.get(SoftDependencies).get(Greeter)).toThrow(
          /Symbol\(Greeter\).*Resolve it at start or later/
        );
      });
    });

    describe('getAll', () => {
      it('should return every exposed binding exactly once', () => {
        const owner = createPlugin(token1, ({ expose }) => {
          expose(Widget).toConstantValue('owner');
        });
        const contributor = createPlugin(token2, ({ expose }) => {
          expose(Widget).toConstantValue('contributor.1');
          expose(Widget).toConstantValue('contributor.2');
        });
        setupAndStart(owner, contributor);

        expect(owner.get(SoftDependencies).getAll(Widget).sort()).toEqual([
          'contributor.1',
          'contributor.2',
          'owner',
        ]);
      });

      it('should return an empty list when no plugin exposes the service', () => {
        const owner = createPlugin(token1);
        setupAndStart(owner);

        expect(owner.get(SoftDependencies).getAll(Widget)).toEqual([]);
      });

      it('should throw before all plugins finished setup', () => {
        const owner = createPlugin(token1);
        owner.get(Setup);

        expect(() => owner.get(SoftDependencies).getAll(Widget)).toThrow(
          /Symbol\(Widget\).*Resolve it at start or later/
        );
      });
    });

    describe('collect', () => {
      it('should collect contributions from other plugins and the owner exactly once', () => {
        const Registry = Symbol.for('Registry') as ServiceIdentifier<string[]>;
        const owner = createPlugin(token1, ({ bind, collect, expose }) => {
          bind(Registry).toConstantValue([]);
          collect(Widget, Registry, (_context, widget, registry) => registry.push(widget));
          expose(Widget).toConstantValue('owner');
        });
        const contributor1 = createPlugin(token2, ({ expose }) => {
          expose(Widget).toConstantValue('contributor1');
        });
        const contributor2 = createPlugin(token3, ({ expose }) => {
          expose(Widget).toConstantValue('contributor2');
        });
        setupAndStart(contributor1, owner, contributor2);

        expect(owner.get(Registry).sort()).toEqual(['contributor1', 'contributor2', 'owner']);
      });

      it('should not call the handler when there are no contributions', () => {
        const handler = jest.fn();
        const owner = createPlugin(token1, ({ collect }) => {
          collect(Widget, handler);
        });
        setupAndStart(owner);

        expect(handler).not.toHaveBeenCalled();
      });

      it('should not collect contributions before start', () => {
        const handler = jest.fn();
        const owner = createPlugin(token1, ({ collect }) => {
          collect(Widget, handler);
        });
        const contributor = createPlugin(token2, ({ expose }) => {
          expose(Widget).toConstantValue('contributor');
        });
        owner.get(Setup);
        contributor.get(Setup);

        expect(handler).not.toHaveBeenCalled();
      });
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
