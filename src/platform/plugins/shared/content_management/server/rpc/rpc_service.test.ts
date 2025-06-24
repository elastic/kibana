/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { ProcedureDefinition, RpcService } from './rpc_service';

describe('RpcService', () => {
  describe('register()', () => {
    test('should register a procedure', async () => {
      const rpc = new RpcService<{}, 'foo'>();
      const fn = jest.fn();
      const procedure: ProcedureDefinition<{}> = { fn };
      rpc.register('foo', procedure);

      const context = {};
      await rpc.call(context, 'foo');

      expect(fn).toHaveBeenCalledWith(context, undefined);
    });
  });

  describe('call()', () => {
    test('should require a schema if an input is passed', async () => {
      const rpc = new RpcService<{}, 'foo'>();
      const fn = jest.fn();
      const procedure: ProcedureDefinition<{}> = { fn };
      rpc.register('foo', procedure);

      const context = {};
      const input = { foo: 'bar' };

      await expect(() => {
        return rpc.call(context, 'foo', input);
      }).rejects.toEqual(new Error('Input schema missing for [foo] procedure.'));
    });

    test('should call the provided handler with the input and context', async () => {
      const rpc = new RpcService<{}, 'foo'>();

      const output = { success: true };

      const fn = jest.fn().mockResolvedValue(output);
      const procedure: ProcedureDefinition<{}> = {
        fn,
        schemas: { in: schema.object({ foo: schema.string() }), out: schema.any() },
      };
      rpc.register('foo', procedure);

      const context = {};
      const input = { foo: 'bar' };

      const { result } = await rpc.call(context, 'foo', input);

      expect(fn).toHaveBeenCalledWith(context, input);
      expect(result).toEqual(output);
    });

    test('should throw an error if the procedure is not registered', async () => {
      const rpc = new RpcService();

      await expect(() => {
        return rpc.call(undefined, 'unknown');
      }).rejects.toEqual(new Error('Procedure [unknown] is not registered.'));
    });

    test('should validate that the input is valid', async () => {
      const rpc = new RpcService<{}, 'foo'>();

      const fn = jest.fn();
      const procedure: ProcedureDefinition<{}> = {
        fn,
        schemas: { in: schema.object({ foo: schema.string() }), out: schema.any() },
      };
      rpc.register('foo', procedure);

      const context = {};
      const input = { bad: 'unknown prop' };

      await expect(() => {
        return rpc.call(context, 'foo', input);
      }).rejects.toEqual(new Error('[foo]: expected value of type [string] but got [undefined]'));
    });

    test('should validate the output if schema is provided', async () => {
      const rpc = new RpcService<{}, 'foo'>();

      const fn = jest.fn().mockResolvedValue({ bad: 'unknown prop' });
      const procedure: ProcedureDefinition<{}> = {
        fn,
        schemas: { in: schema.never(), out: schema.object({ foo: schema.string() }) },
      };
      rpc.register('foo', procedure);

      const context = {};
      await expect(() => {
        return rpc.call(context, 'foo');
      }).rejects.toEqual(new Error('[foo]: expected value of type [string] but got [undefined]'));
    });
  });
});
