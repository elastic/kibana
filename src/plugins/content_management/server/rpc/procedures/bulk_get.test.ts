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
import { bulkGet } from './bulk_get';

const { fn, schemas } = bulkGet;

const inputSchema = schemas?.in;
const outputSchema = schemas?.out;

if (!inputSchema) {
  throw new Error(`Input schema missing for [bulkGet] procedure.`);
}

if (!outputSchema) {
  throw new Error(`Output schema missing for [bulkGet] procedure.`);
}

const FOO_CONTENT_ID = 'foo';

describe('RPC -> bulkGet()', () => {
  describe('Input/Output validation', () => {
    const ids = ['123', '456'];
    const validInput = { contentTypeId: 'foo', ids, version: 'v1' };

    /**
     * These tests are for the procedure call itself. Every RPC needs to declare in/out schema
     * We will test _specific_ validation schema inside the procedure in separate tests.
     */
    test('should validate that a contentTypeId and "ids" array is passed', () => {
      [
        { input: validInput },
        {
          input: omit(validInput, 'contentTypeId'),
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
          input: omit(validInput, 'ids'),
          expectedError: '[ids]: expected value of type [array] but got [undefined]',
        },
        {
          input: { ...validInput, ids: [] }, // ids array needs at least one value
          expectedError: '[ids]: array size is [0], but cannot be smaller than [1]',
        },
        {
          input: { ...validInput, ids: [''] }, // ids must havr 1 char min
          expectedError: '[ids.0]: value has length [0] but it must have a minimum length of [1].',
        },
        {
          input: { ...validInput, ids: 123 }, // ids is not an array of string
          expectedError: '[ids]: expected value of type [array] but got [number]',
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
          ids: ['123'],
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
          ids: ['123'],
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

    test('should return the storage bulkGet() result', async () => {
      const { ctx, storage } = setup();

      const expected = ['Item1', 'Item2'];
      storage.bulkGet.mockResolvedValueOnce(expected);

      const result = await fn(ctx, {
        contentTypeId: FOO_CONTENT_ID,
        version: 'v1',
        ids: ['123', '456'],
      });

      expect(result).toEqual({
        contentTypeId: FOO_CONTENT_ID,
        items: expected,
      });

      expect(storage.bulkGet).toHaveBeenCalledWith(
        {
          requestHandlerContext: ctx.requestHandlerContext,
          version: {
            request: 'v1',
            latest: 'v2', // from the registry
          },
        },
        ['123', '456'],
        undefined
      );
    });

    describe('validation', () => {
      test('should validate that content type definition exist', () => {
        const { ctx } = setup();
        expect(() => fn(ctx, { contentTypeId: 'unknown', ids: ['123', '456'] })).rejects.toEqual(
          new Error('Content [unknown] is not registered.')
        );
      });

      test('should throw if the request version is higher than the registered version', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, {
            contentTypeId: FOO_CONTENT_ID,
            ids: ['123', '456'],
            version: 'v7',
          })
        ).rejects.toEqual(new Error('Invalid version. Latest version is [v2].'));
      });
    });
  });
});
