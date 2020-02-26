/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
