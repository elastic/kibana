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

import { Container } from 'inversify';
import { CoreInjectionService } from './service';
import { Plugin } from './modules/plugin';

describe('CoreInjectionService', () => {
  let service: CoreInjectionService;

  beforeEach(() => {
    service = new CoreInjectionService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setup', () => {
    let setup: ReturnType<CoreInjectionService['setup']>;

    beforeEach(() => {
      jest.spyOn(Container.prototype, 'loadSync').mockReturnValue(undefined);
      setup = service.setup();
    });

    it('should return a setup contract', () => {
      expect(setup).toEqual({
        getContainer: expect.any(Function),
      });
    });

    it('should load the plugin module into the root container', () => {
      expect(Container.prototype.loadSync).toHaveBeenCalledWith(pluginModuleMock);
    });

    describe('getContainer', () => {
      it('should return the root container if no identifier is provided', () => {
        expect(setup.getContainer()).toBeInstanceOf(Container);
      });

      it('should return the plugin container for the specified identifier', () => {
        const id = Symbol.for('test');
        const plugin = {} as Container;
        const root = setup.getContainer();

        root.bind(Plugin).toConstantValue(() => plugin);
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
      const plugin = {} as Container;

      let root: Container;

      beforeEach(() => {
        root = start.getContainer();
        root.bind('something').toConstantValue('value');
        root.bind(Plugin).toConstantValue(() => plugin);
      });

      it('should create a child container if no identifier is provided', () => {
        const fork = start.fork();

        expect(fork).not.toBe(root);
        expect(fork.get('something')).toBe('value');
      });

      it('should return the plugin container resolved in the forked scope for the specified identifier', () => {
        const getSpy = jest.spyOn(Container.prototype, 'get');

        expect(start.fork(id)).toBe(plugin);

        const [fork] = getSpy.mock.contexts;
        expect(fork).not.toBe(root);
        expect(fork.get('something')).toBe('value');
      });

      it('should unbind all bindings in the forked container when deactivating the plugin scope', () => {
        const getSpy = jest.spyOn(Container.prototype, 'get');

        start.fork(id);
        const [fork] = getSpy.mock.contexts;
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
