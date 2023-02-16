/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { validate } from '../../utils';
import { ContentRegistry } from '../../core/registry';
import { createMockedStorage } from '../../core/mocks';
import type { RpcSchemas } from '../../core';
import { EventBus } from '../../core/event_bus';

import { get } from './get';

const { fn, schemas } = get;

const inputSchema = schemas?.in;
const outputSchema = schemas?.out;

if (!inputSchema) {
  throw new Error(`Input schema missing for [get] procedure.`);
}

if (!outputSchema) {
  throw new Error(`Output schema missing for [get] procedure.`);
}

const FOO_CONTENT_ID = 'foo';

describe('RPC -> get()', () => {
  describe('Input/Output validation', () => {
    /**
     * These tests are for the procedure call itself. Every RPC needs to declare in/out schema
     * We will test _specific_ validation schema inside the procedure in separate tests.
     */
    test('should validate that a contentTypeId and an id is passed', () => {
      [
        { input: { contentTypeId: 'foo', id: '123' } },
        {
          input: { id: '777' }, // contentTypeId missing
          expectedError: '[contentTypeId]: expected value of type [string] but got [undefined]',
        },
        {
          input: { contentTypeId: 'foo', id: '123', unknown: 'foo' },
          expectedError: '[unknown]: definition for this key is missing',
        },
      ].forEach(({ input, expectedError }) => {
        const error = validate(input, inputSchema);

        if (!expectedError) {
          try {
            expect(error).toBe(null);
          } catch (e) {
            throw new Error(`Expected no error but got [{${error?.message}}].`);
          }
        } else {
          expect(error?.message).toBe(expectedError);
        }
      });
    });

    test('should allow an options "object" to be passed', () => {
      let error = validate(
        {
          contentTypeId: 'foo',
          id: '123',
          options: { any: 'object' },
        },
        inputSchema
      );

      expect(error).toBe(null);

      error = validate(
        {
          contentTypeId: 'foo',
          id: '123',
          options: 123, // Not an object
        },
        inputSchema
      );

      expect(error?.message).toBe(
        '[options]: expected a plain object value, but found [number] instead.'
      );
    });

    test('should validate that the response is an object', () => {
      let error = validate(
        {
          any: 'object',
        },
        outputSchema
      );

      expect(error).toBe(null);

      error = validate(123, outputSchema);

      expect(error?.message).toBe('expected a plain object value, but found [number] instead.');
    });
  });

  describe('procedure', () => {
    const createSchemas = (): RpcSchemas => {
      return {} as any;
    };

    const setup = ({ contentSchemas = createSchemas() } = {}) => {
      const contentRegistry = new ContentRegistry(new EventBus());
      const storage = createMockedStorage();
      contentRegistry.register({
        id: FOO_CONTENT_ID,
        storage,
        schemas: {
          content: contentSchemas,
        },
      });

      const requestHandlerContext = 'mockedRequestHandlerContext';
      const ctx: any = { contentRegistry, requestHandlerContext };

      return { ctx, storage };
    };

    test('should return the storage get() result', async () => {
      const { ctx, storage } = setup();

      const expected = 'GetResult';
      storage.get.mockResolvedValueOnce(expected);

      const result = await fn(ctx, { contentTypeId: FOO_CONTENT_ID, id: '1234' });

      expect(result).toEqual({
        contentTypeId: FOO_CONTENT_ID,
        item: expected,
      });

      expect(storage.get).toHaveBeenCalledWith(
        { requestHandlerContext: ctx.requestHandlerContext },
        '1234',
        undefined
      );
    });

    describe('validation', () => {
      test('should validate that content type definition exist', () => {
        const { ctx } = setup();
        expect(() => fn(ctx, { contentTypeId: 'unknown', id: '1234' })).rejects.toEqual(
          new Error('Content [unknown] is not registered.')
        );
      });

      test('should enforce a schema for options if options are passed', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, { contentTypeId: FOO_CONTENT_ID, id: '1234', options: { foo: 'bar' } })
        ).rejects.toEqual(new Error('Schema missing for rpc procedure [get.in.options].'));
      });

      test('should validate the options', () => {
        const { ctx } = setup({
          contentSchemas: {
            get: {
              in: {
                options: schema.object({ validOption: schema.maybe(schema.boolean()) }),
              },
            },
          } as any,
        });
        expect(() =>
          fn(ctx, { contentTypeId: FOO_CONTENT_ID, id: '1234', options: { foo: 'bar' } })
        ).rejects.toEqual(new Error('[foo]: definition for this key is missing'));
      });

      test('should validate the result if schema is provided', () => {
        const { ctx, storage } = setup({
          contentSchemas: {
            get: {
              out: { result: schema.object({ validField: schema.maybe(schema.boolean()) }) },
            },
          } as any,
        });

        const invalidResult = { wrongField: 'bad' };
        storage.get.mockResolvedValueOnce(invalidResult);

        expect(() => fn(ctx, { contentTypeId: FOO_CONTENT_ID, id: '1234' })).rejects.toEqual(
          new Error('[wrongField]: definition for this key is missing')
        );
      });
    });
  });
});
