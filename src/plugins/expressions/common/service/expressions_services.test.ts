/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionsService } from './expressions_services';

describe('ExpressionsService', () => {
  test('can instantiate', () => {
    new ExpressionsService();
  });

  test('returns expected setup contract', () => {
    const expressions = new ExpressionsService();

    expect(expressions.setup()).toMatchObject({
      getFunction: expect.any(Function),
      getFunctions: expect.any(Function),
      getRenderer: expect.any(Function),
      getRenderers: expect.any(Function),
      getType: expect.any(Function),
      getTypes: expect.any(Function),
      registerFunction: expect.any(Function),
      registerType: expect.any(Function),
      registerRenderer: expect.any(Function),
      fork: expect.any(Function),
    });
  });

  test('returns expected start contract', () => {
    const expressions = new ExpressionsService();
    expressions.setup();

    expect(expressions.start()).toMatchObject({
      getFunction: expect.any(Function),
      getFunctions: expect.any(Function),
      getRenderer: expect.any(Function),
      getRenderers: expect.any(Function),
      getType: expect.any(Function),
      getTypes: expect.any(Function),
      registerFunction: expect.any(Function),
      registerType: expect.any(Function),
      registerRenderer: expect.any(Function),
      execute: expect.any(Function),
      run: expect.any(Function),
    });
  });

  test('has pre-installed default functions', () => {
    const expressions = new ExpressionsService();

    expect(typeof expressions.setup().getFunctions().var_set).toBe('object');
  });

  describe('.fork()', () => {
    test('returns a new ExpressionsService instance', () => {
      const service = new ExpressionsService();
      const fork = service.fork();

      expect(fork).not.toBe(service);
      expect(fork).toBeInstanceOf(ExpressionsService);
    });

    test('fork keeps all types of the origin service', () => {
      const service = new ExpressionsService();
      const fork = service.fork();

      expect(fork.getTypes()).toEqual(service.getTypes());
    });

    test('fork keeps all functions of the origin service', () => {
      const service = new ExpressionsService();
      const fork = service.fork();

      expect(fork.getFunctions()).toEqual(service.getFunctions());
    });

    test('fork keeps context of the origin service', () => {
      const service = new ExpressionsService();
      const fork = service.fork();

      expect(fork.executor.state.context).toEqual(service.executor.state.context);
    });

    test('newly registered functions in origin are also available in fork', () => {
      const service = new ExpressionsService();
      const fork = service.fork();

      service.registerFunction({
        name: '__test__',
        args: {},
        help: '',
        fn: () => {},
      });

      expect(fork.getFunctions()).toEqual(service.getFunctions());
    });

    test('newly registered functions in fork are NOT available in origin', () => {
      const service = new ExpressionsService();
      const fork = service.fork();

      fork.registerFunction({
        name: '__test__',
        args: {},
        help: '',
        fn: () => {},
      });

      expect(Object.values(fork.getFunctions())).toHaveLength(
        Object.values(service.getFunctions()).length + 1
      );
    });

    test('fork can execute an expression with newly registered function', async () => {
      const service = new ExpressionsService();
      const fork = service.fork();
      fork.start();

      service.registerFunction({
        name: '__test__',
        args: {},
        help: '',
        fn: () => {
          return '123';
        },
      });

      const { result } = await fork.run('__test__', null).toPromise();

      expect(result).toBe('123');
    });

    test('throw on fork if the service is already started', async () => {
      const service = new ExpressionsService();
      service.start();

      expect(() => service.fork()).toThrow();
    });
  });

  describe('.execute()', () => {
    test('throw if the service is not started', () => {
      const expressions = new ExpressionsService();

      expect(() => expressions.execute('foo', null)).toThrow();
    });
  });

  describe('.run()', () => {
    test('throw if the service is not started', () => {
      const expressions = new ExpressionsService();

      expect(() => expressions.run('foo', null)).toThrow();
    });
  });
});
