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
import { create } from './create';

const { fn, schemas } = create;

const inputSchema = schemas?.in;
const outputSchema = schemas?.out;

if (!inputSchema) {
  throw new Error(`Input schema missing for [create] procedure.`);
}

if (!outputSchema) {
  throw new Error(`Output schema missing for [create] procedure.`);
}

const FOO_CONTENT_ID = 'foo';
const fooDataSchema = schema.object({ title: schema.string() }, { unknowns: 'forbid' });

describe('RPC -> create()', () => {
  describe('Input/Output validation', () => {
    /**
     * These tests are for the procedure call itself. Every RPC needs to declare in/out schema
     * We will test _specific_ validation schema inside the procedure in separate tests.
     */
    test('should validate that a contentTypeId and "data" object is passed', () => {
      [
        { input: { contentTypeId: 'foo', data: { title: 'hello' } } },
        {
          input: { data: { title: 'hello' } }, // contentTypeId missing
          expectedError: '[contentTypeId]: expected value of type [string] but got [undefined]',
        },
        {
          input: { contentTypeId: 'foo' }, // data missing
          expectedError: '[data]: expected value of type [object] but got [undefined]',
        },
        {
          input: { contentTypeId: 'foo', data: 123 }, // data is not an object
          expectedError: '[data]: expected value of type [object] but got [number]',
        },
        {
          input: { contentTypeId: 'foo', data: { title: 'hello' }, unknown: 'foo' },
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
          data: { title: 'hello' },
          options: { any: 'object' },
        },
        inputSchema
      );

      expect(error).toBe(null);

      error = validate(
        {
          contentTypeId: 'foo',
          data: { title: 'hello' },
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
      return {
        create: {
          in: {
            data: fooDataSchema,
          },
        },
      } as any;
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

    test('should return the storage create() result', async () => {
      const { ctx, storage } = setup();

      const expected = 'CreateResult';
      storage.create.mockResolvedValueOnce(expected);

      const result = await fn(ctx, { contentTypeId: FOO_CONTENT_ID, data: { title: 'Hello' } });

      expect(result).toEqual({
        contentTypeId: FOO_CONTENT_ID,
        result: expected,
      });

      expect(storage.create).toHaveBeenCalledWith(
        { requestHandlerContext: ctx.requestHandlerContext },
        { title: 'Hello' },
        undefined
      );
    });

    describe('validation', () => {
      test('should validate that content type definition exist', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, { contentTypeId: 'unknown', data: { title: 'Hello' } })
        ).rejects.toEqual(new Error('Content [unknown] is not registered.'));
      });

      test('should enforce a schema for the data', () => {
        const { ctx } = setup({ contentSchemas: {} as any });
        expect(() => fn(ctx, { contentTypeId: FOO_CONTENT_ID, data: {} })).rejects.toEqual(
          new Error('Schema missing for rpc procedure [create.in.data].')
        );
      });

      test('should validate the data sent in input - missing field', () => {
        const { ctx } = setup();
        expect(() => fn(ctx, { contentTypeId: FOO_CONTENT_ID, data: {} })).rejects.toEqual(
          new Error('[title]: expected value of type [string] but got [undefined]')
        );
      });

      test('should validate the data sent in input - unknown field', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, {
            contentTypeId: FOO_CONTENT_ID,
            data: { title: 'Hello', unknownField: 'Hello' },
          })
        ).rejects.toEqual(new Error('[unknownField]: definition for this key is missing'));
      });

      test('should enforce a schema for options if options are passed', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, {
            contentTypeId: FOO_CONTENT_ID,
            data: { title: 'Hello' },
            options: { foo: 'bar' },
          })
        ).rejects.toEqual(new Error('Schema missing for rpc procedure [create.in.options].'));
      });

      test('should validate the options', () => {
        const { ctx } = setup({
          contentSchemas: {
            create: {
              in: {
                data: fooDataSchema,
                options: schema.object({ validOption: schema.maybe(schema.boolean()) }),
              },
            },
          } as any,
        });
        expect(() =>
          fn(ctx, {
            contentTypeId: FOO_CONTENT_ID,
            data: { title: 'Hello' },
            options: { foo: 'bar' },
          })
        ).rejects.toEqual(new Error('[foo]: definition for this key is missing'));
      });

      test('should validate the result if schema is provided', () => {
        const { ctx, storage } = setup({
          contentSchemas: {
            create: {
              in: { data: fooDataSchema },
              out: { result: schema.object({ validField: schema.maybe(schema.boolean()) }) },
            },
          } as any,
        });

        const invalidResult = { wrongField: 'bad' };
        storage.create.mockResolvedValueOnce(invalidResult);

        expect(() =>
          fn(ctx, { contentTypeId: FOO_CONTENT_ID, data: { title: 'Hello' } })
        ).rejects.toEqual(new Error('[wrongField]: definition for this key is missing'));
      });
    });
  });
});
