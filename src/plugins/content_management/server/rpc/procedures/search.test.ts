/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';

import { validate } from '../../utils';
import { ContentRegistry } from '../../core/registry';
import { createMockedStorage } from '../../core/mocks';
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

describe('RPC -> search()', () => {
  describe('Input/Output validation', () => {
    const query = { title: 'hello' };
    const validInput = { contentTypeId: 'foo', version: 'v1', query };

    test('should validate that a contentTypeId and "query" object is passed', () => {
      [
        { input: validInput },
        {
          input: { query }, // contentTypeId missing
          expectedError: '[contentTypeId]: expected value of type [string] but got [undefined]',
        },
        {
          input: omit(validInput, 'version'),
          expectedError: '[version]: expected value of type [string] but got [undefined]',
        },
        {
          input: { ...validInput, version: '1' }, // invalid version format
          expectedError: '[version]: must follow the pattern [v${number}]',
        },
        {
          input: omit(validInput, 'query'),
          expectedError: '[query]: expected value of type [object] but got [undefined]',
        },
        {
          input: { ...validInput, query: 123 }, // query is not an object
          expectedError: '[query]: expected value of type [object] but got [number]',
        },
        {
          input: { ...validInput, unknown: 'foo' },
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
          version: 'v1',
          options: { any: 'object' },
        },
        inputSchema
      );

      expect(error).toBe(null);

      error = validate(
        {
          contentTypeId: 'foo',
          version: 'v1',
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
    const setup = () => {
      const contentRegistry = new ContentRegistry(new EventBus());
      const storage = createMockedStorage();
      contentRegistry.register({
        id: FOO_CONTENT_ID,
        storage,
        version: {
          latest: 'v2',
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

      const result = await fn(ctx, {
        contentTypeId: FOO_CONTENT_ID,
        version: 'v1', // version in request
        query: { title: 'Hello' },
      });

      expect(result).toEqual({
        contentTypeId: FOO_CONTENT_ID,
        result: expected,
      });

      expect(storage.search).toHaveBeenCalledWith(
        {
          requestHandlerContext: ctx.requestHandlerContext,
          version: {
            request: 'v1',
            latest: 'v2', // from the registry
          },
        },
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

      test('should throw if the request version is higher than the registered version', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, {
            contentTypeId: FOO_CONTENT_ID,
            query: { title: 'Hello' },
            version: 'v7',
          })
        ).rejects.toEqual(new Error('Invalid version. Latest version is [v2].'));
      });
    });
  });
});
