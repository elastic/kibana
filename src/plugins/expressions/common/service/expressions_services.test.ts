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
      getFunctions: expect.any(Function),
      registerFunction: expect.any(Function),
      registerType: expect.any(Function),
      registerRenderer: expect.any(Function),
      run: expect.any(Function),
    });
  });

  test('returns expected start contract', () => {
    const expressions = new ExpressionsService();
    expressions.setup();

    expect(expressions.start()).toMatchObject({
      getFunctions: expect.any(Function),
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

      expect(fork.executor.state.get().types).toEqual(service.executor.state.get().types);
    });

    test('fork keeps all functions of the origin service', () => {
      const service = new ExpressionsService();
      const fork = service.fork();

      expect(fork.executor.state.get().functions).toEqual(service.executor.state.get().functions);
    });

    test('fork keeps context of the origin service', () => {
      const service = new ExpressionsService();
      const fork = service.fork();

      expect(fork.executor.state.get().context).toEqual(service.executor.state.get().context);
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

      expect(fork.executor.state.get().functions).toEqual(service.executor.state.get().functions);
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

      expect(Object.values(fork.executor.state.get().functions)).toHaveLength(
        Object.values(service.executor.state.get().functions).length + 1
      );
    });

    test('fork can execute an expression with newly registered function', async () => {
      const service = new ExpressionsService();
      const fork = service.fork();

      service.registerFunction({
        name: '__test__',
        args: {},
        help: '',
        fn: () => {
          return '123';
        },
      });

      const result = await fork.run('__test__', null);

      expect(result).toBe('123');
    });
  });
});
