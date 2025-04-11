/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, type interfaces } from 'inversify';
import { Global, OnSetup } from '@kbn/core-di';
import { Plugin, PluginModule } from './plugin';

describe('PluginModule', () => {
  let root: interfaces.Container;

  beforeEach(() => {
    root = new Container();
    root.load(new PluginModule());
  });

  describe('Plugin', () => {
    it('should throw if target is not named', () => {
      expect(() => root.get(Plugin)).toThrowError('Plugin instance must be named.');
    });

    it('should create an isolated child container', () => {
      const getNamed = jest.fn(() => root.getNamed(Plugin, 'something'));

      expect(getNamed).not.toThrow();
      expect(getNamed).toReturnWith(expect.any(Container));
      expect(getNamed).toReturnWith(expect.objectContaining({ parent: root }));
    });

    it('should return the same child container instance for the same id', () => {
      const child1 = root.getNamed(Plugin, 'child1');
      const child2 = root.getNamed(Plugin, 'child2');

      expect(root.getNamed(Plugin, 'child1')).toBe(child1);
      expect(root.getNamed(Plugin, 'child2')).toBe(child2);
    });

    it('should dispose the child container when the parent is disposed', () => {
      const child = root.getNamed(Plugin, 'child');
      child.bind('test').toConstantValue('test');
      root.unbindAll();

      expect(child.isCurrentBound('test')).toBe(false);
    });

    it('should disassociate the child container from the parent when disposed', () => {
      const child = root.getNamed(Plugin, 'child');
      child.unbindAll();

      expect(root.getNamed(Plugin, 'child')).not.toBe(child);
    });

    it('should create grandchild containers from the related child container', () => {
      const child = root.getNamed(Plugin, 'child');
      const scope = root.createChild();
      const grandchild = scope.getNamed(Plugin, 'child');

      expect(grandchild).not.toBe(child);
      expect(grandchild.parent).toBe(child);
    });
  });

  describe('Global', () => {
    function activate(id: string) {
      const plugin = root.getNamed(Plugin, id);
      plugin.getAll(OnSetup).forEach((setup) => setup(plugin));
    }

    let plugin1: interfaces.Container;
    let plugin2: interfaces.Container;

    beforeEach(() => {
      plugin1 = root.getNamed(Plugin, 'plugin1');
      plugin1.bind('service1').toConstantValue('service1');
      plugin1.bind('service2').toConstantValue('service2');
      plugin1.bind(Global).toConstantValue('service1');

      plugin2 = root.getNamed(Plugin, 'plugin2');
      plugin2.bind('service3').toConstantValue('service3.1');
      plugin2.bind('service3').toConstantValue('service3.2');
      plugin2.bind('service4').toConstantValue('service4');
      plugin2.bind(Global).toConstantValue('service3');
      plugin2.bind(Global).toConstantValue('service3');

      activate('plugin1');
      activate('plugin2');
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
        const plugin3 = root.getNamed(Plugin, 'plugin3');
        plugin3.bind('service5').toService('service1');

        expect(plugin3.get('service5')).toBe('service1');
      });

      it('should inherit services from the parent scope', () => {
        const fork = root.createChild();
        const plugin1Fork = fork.getNamed(Plugin, 'plugin1');

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
      let fork: interfaces.Container;
      let plugin2Fork: interfaces.Container;
      let plugin3: interfaces.Container;

      beforeEach(() => {
        plugin3 = root.getNamed(Plugin, 'plugin3');
        plugin3
          .bind('service5')
          .toDynamicValue(({ container }) => container.getAll('service6'))
          .inRequestScope();
        plugin3.bind(Global).toConstantValue('service5');

        activate('plugin3');

        fork = root.createChild();
        plugin2Fork = fork.getNamed(Plugin, 'plugin2');
      });

      it('should resolve dependencies from the forked context', () => {
        plugin2Fork.bind('service6').toConstantValue('service6');
        plugin2Fork.bind(Global).toConstantValue('service6');

        expect(() => plugin2.get('service5')).toThrow();
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
});
