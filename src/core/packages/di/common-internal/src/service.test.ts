/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const pluginModuleMock = {};

jest.mock('./modules/plugin', () => ({
  ...jest.requireActual('./modules/plugin'),
  PluginModule: jest.fn().mockReturnValue(pluginModuleMock),
}));

import { Container, type interfaces } from 'inversify';
import { CoreInjectionService } from './service';
import { Plugin } from './modules/plugin';

describe('CoreInjectionService', () => {
  let service: CoreInjectionService;

  beforeEach(() => {
    service = new CoreInjectionService();
  });

  describe('setup', () => {
    let setup: ReturnType<CoreInjectionService['setup']>;

    beforeEach(() => {
      jest.spyOn(Container.prototype, 'load').mockImplementation(() => {});
      setup = service.setup();
    });

    it('should return a setup contract', () => {
      expect(setup).toEqual({
        getContainer: expect.any(Function),
      });
    });

    it('should load the plugin module into the root container', () => {
      expect(Container.prototype.load).toHaveBeenCalledWith(pluginModuleMock);
    });

    describe('getContainer', () => {
      it('should return the root container if no identifier is provided', () => {
        expect(setup.getContainer()).toBeInstanceOf(Container);
      });

      it('should return the plugin container for the specified identifier', () => {
        const id = Symbol.for('test');
        const plugin = {} as interfaces.Container;
        const root = setup.getContainer();

        root.bind(Plugin).toConstantValue(plugin).whenTargetNamed(id);
        expect(setup.getContainer(id)).toBe(plugin);
      });
    });
  });

  describe('start', () => {
    let start: ReturnType<CoreInjectionService['start']>;

    beforeEach(() => {
      start = service.start();
    });

    it('should return a start contract', () => {
      expect(start).toEqual({
        fork: expect.any(Function),
        getContainer: expect.any(Function),
      });
    });

    describe('fork', () => {
      const id = Symbol.for('test');
      const plugin = {} as interfaces.Container;

      let root: interfaces.Container;

      beforeEach(() => {
        root = start.getContainer();
        root.bind(Plugin).toConstantValue(plugin).whenTargetNamed(id);
      });

      it('should create a child container if no identifier is provided', () => {
        const fork = start.fork();

        expect(fork).not.toBe(root);
        expect(fork.parent).toBe(root);
      });

      it('should return the plugin container resolved in the forked scope for the specified identifier', () => {
        const getNamedSpy = jest.spyOn(Container.prototype, 'getNamed');

        expect(start.fork(id)).toBe(plugin);

        const [fork] = getNamedSpy.mock.contexts;
        expect(fork).not.toBe(root);
        expect(fork.parent).toBe(root);
      });

      it('should unbind all bindings in the forked container when deactivating the plugin scope', () => {
        const getNamedSpy = jest.spyOn(Container.prototype, 'getNamed');

        start.fork(id);
        const [fork] = getNamedSpy.mock.contexts;
        fork.bind(id).toConstantValue(plugin);
        fork.get(id);
        jest.spyOn(fork, 'unbindAll');
        jest.useFakeTimers();
        fork.unbind(id);
        jest.runAllTimers();
        jest.useRealTimers();

        expect(fork.unbindAll).toHaveBeenCalledTimes(1);
      });
    });
  });
});
