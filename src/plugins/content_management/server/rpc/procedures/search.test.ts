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
import { search } from './search';

const { fn, schemas } = search;

const inputSchema = schemas?.in;
const outputSchema = schemas?.out;

if (!inputSchema) {
  throw new Error(`Input schema missing for [search] procedure.`);
}

if (!outputSchema) {
  throw new Error(`Output schema missing for [search] procedure.`);
}

const FOO_CONTENT_ID = 'foo';
const fooDataSchema = schema.object({ title: schema.string() }, { unknowns: 'forbid' });

describe('RPC -> search()', () => {
  describe('Input/Output validation', () => {
    /**
     * These tests are for the procedure call itself. Every RPC needs to declare in/out schema
     * We will test _specific_ validation schema inside the procedure in separate tests.
     */
    test('should validate that a contentTypeId and "query" object is passed', () => {
      const query = { title: 'hello' };

      [
        { input: { contentTypeId: 'foo', query } },
        {
          input: { query }, // contentTypeId missing
          expectedError: '[contentTypeId]: expected value of type [string] but got [undefined]',
        },
        {
          input: { contentTypeId: 'foo' }, // query missing
          expectedError: '[query]: expected value of type [object] but got [undefined]',
        },
        {
          input: { contentTypeId: 'foo', query: 123 }, // query is not an object
          expectedError: '[query]: expected value of type [object] but got [number]',
        },
        {
          input: { contentTypeId: 'foo', query, unknown: 'foo' },
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
          query: { title: 'hello' },
          options: { any: 'object' },
        },
        inputSchema
      );

      expect(error).toBe(null);

      error = validate(
        {
          contentTypeId: 'foo',
          query: { title: 'hello' },
          options: 123, // Not an object
        },
        inputSchema
      );

      expect(error?.message).toBe(
        '[options]: expected a plain object value, but found [number] instead.'
      );
    });

    test('should validate that the response is an object or an array of object', () => {
      let error = validate(
        {
          any: 'object',
        },
        outputSchema
      );

      expect(error).toBe(null);

      error = validate(
        [
          {
            any: 'object',
          },
        ],
        outputSchema
      );

      expect(error).toBe(null);

      error = validate(123, outputSchema);

      expect(error?.message).toContain(
        'expected a plain object value, but found [number] instead.'
      );
      expect(error?.message).toContain('expected value of type [array] but got [number]');
    });
  });

  describe('procedure', () => {
    const createSchemas = (): RpcSchemas => {
      return {
        search: {
          in: {
            query: fooDataSchema,
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

    test('should return the storage search() result', async () => {
      const { ctx, storage } = setup();

      const expected = 'SearchResult';
      storage.search.mockResolvedValueOnce(expected);

      const result = await fn(ctx, { contentTypeId: FOO_CONTENT_ID, query: { title: 'Hello' } });

      expect(result).toEqual({
        contentTypeId: FOO_CONTENT_ID,
        result: expected,
      });

      expect(storage.search).toHaveBeenCalledWith(
        { requestHandlerContext: ctx.requestHandlerContext },
        { title: 'Hello' },
        undefined
      );
    });

    describe('validation', () => {
      test('should validate that content type definition exist', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, { contentTypeId: 'unknown', query: { title: 'Hello' } })
        ).rejects.toEqual(new Error('Content [unknown] is not registered.'));
      });

      test('should enforce a schema for the query', () => {
        const { ctx } = setup({ contentSchemas: {} as any });
        expect(() => fn(ctx, { contentTypeId: FOO_CONTENT_ID, query: {} })).rejects.toEqual(
          new Error('Schema missing for rpc procedure [search.in.query].')
        );
      });

      test('should validate the query sent in input - missing field', () => {
        const { ctx } = setup();
        expect(() => fn(ctx, { contentTypeId: FOO_CONTENT_ID, query: {} })).rejects.toEqual(
          new Error('[title]: expected value of type [string] but got [undefined]')
        );
      });

      test('should validate the query sent in input - unknown field', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, {
            contentTypeId: FOO_CONTENT_ID,
            query: { title: 'Hello', unknownField: 'Hello' },
          })
        ).rejects.toEqual(new Error('[unknownField]: definition for this key is missing'));
      });

      test('should enforce a schema for options if options are passed', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, {
            contentTypeId: FOO_CONTENT_ID,
            query: { title: 'Hello' },
            options: { foo: 'bar' },
          })
        ).rejects.toEqual(new Error('Schema missing for rpc procedure [search.in.options].'));
      });

      test('should validate the options', () => {
        const { ctx } = setup({
          contentSchemas: {
            search: {
              in: {
                query: fooDataSchema,
                options: schema.object({ validOption: schema.maybe(schema.boolean()) }),
              },
            },
          } as any,
        });
        expect(() =>
          fn(ctx, {
            contentTypeId: FOO_CONTENT_ID,
            query: { title: 'Hello' },
            options: { foo: 'bar' },
          })
        ).rejects.toEqual(new Error('[foo]: definition for this key is missing'));
      });

      test('should validate the result if schema is provided', () => {
        const { ctx, storage } = setup({
          contentSchemas: {
            search: {
              in: { query: fooDataSchema },
              out: { result: schema.object({ validField: schema.maybe(schema.boolean()) }) },
            },
          } as any,
        });

        const invalidResult = { wrongField: 'bad' };
        storage.search.mockResolvedValueOnce(invalidResult);

        expect(() =>
          fn(ctx, { contentTypeId: FOO_CONTENT_ID, query: { title: 'Hello' } })
        ).rejects.toEqual(new Error('[wrongField]: definition for this key is missing'));
      });
    });
  });
});
