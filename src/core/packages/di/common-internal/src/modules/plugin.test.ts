/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Container } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import { Global, OnSetup, OnStart, Setup, Start } from '@kbn/core-di';
import { Plugin, PluginModule } from './plugin';
import { InternalContainer } from '../container';

describe('PluginModule', () => {
  const token1 = Symbol.for('token1');
  const token2 = Symbol.for('token2');
  const token3 = Symbol.for('token3');

  let root: InternalContainer;

  beforeEach(() => {
    root = new InternalContainer();
    root.loadSync(new PluginModule());
  });

  describe('Plugin', () => {
    it('should create an isolated child container', () => {
      const child = root.get(Plugin)(token1);

      expect(child).toBeInstanceOf(InternalContainer);
      expect(child).toHaveProperty('parent', root);
    });

    it('should return the same child container instance for the same id', () => {
      const child1 = root.get(Plugin)(token1);
      const child2 = root.get(Plugin)(token2);

      expect(root.get(Plugin)(token1)).toBe(child1);
      expect(root.get(Plugin)(token2)).toBe(child2);
    });

    it('should dispose the child container when the parent is disposed', async () => {
      const child = root.get(Plugin)(token1);
      child.bind('test').toConstantValue('test');
      await root.unbindAll();

      expect(child.isCurrentBound('test')).toBe(false);
    });

    it('should disassociate the child container from the parent when disposed', async () => {
      const child = root.get(Plugin)(token1);
      await child.unbindAll();

      expect(root.get(Plugin)(token1)).not.toBe(child);
    });

    it('should create grandchild containers from the related child container', () => {
      const child = root.get(Plugin)(token1);
      const scope = root.createChild();
      const grandchild = scope.get(Plugin)(token1);

      expect(grandchild).not.toBe(child);
      expect(grandchild).toHaveProperty('parent', child);
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
        const fork = root.createChild();
        const plugin1Fork = fork.get(Plugin)(token1);

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
      let fork: Container;
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

        fork = root.createChild();
        plugin2Fork = fork.get(Plugin)(token2);
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
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      root.bind(hook).toConstantValue(handler1);
      plugin.bind(hook).toConstantValue(handler2);
      plugin.get(token);

      expect(handler1).toHaveBeenCalledWith(plugin);
      expect(handler2).toHaveBeenCalledWith(plugin);
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
