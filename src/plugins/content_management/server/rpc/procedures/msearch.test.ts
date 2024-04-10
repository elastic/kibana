/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { MSearchIn, MSearchQuery } from '../../../common';
import { validate, disableTransformsCache } from '../../utils';
import { ContentRegistry } from '../../core/registry';
import { createMockedStorage } from '../../core/mocks';
import { EventBus } from '../../core/event_bus';
import { MSearchService } from '../../core/msearch';
import { mSearch } from './msearch';

disableTransformsCache();
const storageContextGetTransforms = jest.fn();
const spy = () => storageContextGetTransforms;

jest.mock('@kbn/object-versioning', () => {
  const original = jest.requireActual('@kbn/object-versioning');
  return {
    ...original,
    getContentManagmentServicesTransforms: (...args: any[]) => {
      spy()(...args);
      return original.getContentManagmentServicesTransforms(...args);
    },
  };
});

const { fn, schemas } = mSearch;

const inputSchema = schemas?.in;
const outputSchema = schemas?.out;

if (!inputSchema) {
  throw new Error(`Input schema missing for [mSearch] procedure.`);
}

if (!outputSchema) {
  throw new Error(`Output schema missing for [mSearch] procedure.`);
}

describe('RPC -> mSearch()', () => {
  describe('Input/Output validation', () => {
    const query: MSearchQuery = { text: 'hello' };
    const validInput: MSearchIn = {
      contentTypes: [
        { contentTypeId: 'foo', version: 1 },
        { contentTypeId: 'bar', version: 2 },
      ],
      query,
    };

    test('should validate contentTypes and query', () => {
      [
        { input: validInput },
        {
          input: { query }, // contentTypes missing
          expectedError: '[contentTypes]: expected value of type [array] but got [undefined]',
        },
        {
          input: { ...validInput, contentTypes: [] }, // contentTypes is empty
          expectedError: '[contentTypes]: array size is [0], but cannot be smaller than [1]',
        },
        {
          input: { ...validInput, contentTypes: [{ contentTypeId: 'foo' }] }, // contentTypes has no version
          expectedError:
            '[contentTypes.0.version]: expected value of type [number] but got [undefined]',
        },
        {
          input: { ...validInput, query: 123 }, // query is not an object
          expectedError: '[query]: expected a plain object value, but found [number] instead.',
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

    test('should validate the response format with "hits" and "pagination"', () => {
      let error = validate(
        {
          contentTypes: validInput.contentTypes,
          result: {
            hits: [],
            pagination: {
              total: 0,
              cursor: '',
            },
          },
        },
        outputSchema
      );

      expect(error).toBe(null);

      error = validate(123, outputSchema);

      expect(error?.message).toContain(
        'expected a plain object value, but found [number] instead.'
      );
    });
  });

  describe('procedure', () => {
    const setup = () => {
      const contentRegistry = new ContentRegistry(new EventBus());
      const storage = createMockedStorage();
      storage.mSearch = {
        savedObjectType: 'foo-type',
        toItemResult: (ctx, so) => ({ item: so }),
      };
      contentRegistry.register({
        id: `foo`,
        storage,
        version: {
          latest: 2,
        },
      });

      const savedObjectsClient = savedObjectsClientMock.create();
      const mSearchService = new MSearchService({
        getSavedObjectsClient: async () => savedObjectsClient,
        contentRegistry,
        getConfig: {
          listingLimit: async () => 100,
          perPage: async () => 10,
        },
      });

      const mSearchSpy = jest.spyOn(mSearchService, 'search');

      const requestHandlerContext = 'mockedRequestHandlerContext';
      const ctx: any = {
        contentRegistry,
        requestHandlerContext,
        mSearchService,
      };

      return { ctx, storage, savedObjectsClient, mSearchSpy };
    };

    test('should return so find result mapped through toItemResult', async () => {
      const { ctx, savedObjectsClient, mSearchSpy } = setup();

      const soResult = {
        id: 'fooid',
        score: 0,
        type: 'foo-type',
        references: [],
        attributes: {
          title: 'foo',
        },
      };

      savedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [soResult],
        total: 1,
        page: 1,
        per_page: 10,
      });

      const result = await fn(ctx, {
        contentTypes: [{ contentTypeId: 'foo', version: 1 }],
        query: { text: 'Hello' },
      });

      expect(result).toEqual({
        contentTypes: [{ contentTypeId: 'foo', version: 1 }],
        result: {
          hits: [{ item: soResult }],
          pagination: {
            total: 1,
          },
        },
      });

      expect(mSearchSpy).toHaveBeenCalledWith(
        [
          {
            contentTypeId: 'foo',
            ctx: {
              requestHandlerContext: ctx.requestHandlerContext,
              version: {
                request: 1,
                latest: 2, // from the registry
              },
              utils: {
                getTransforms: expect.any(Function),
              },
            },
          },
        ],
        { text: 'Hello' }
      );
    });

    test('should implicitly set the requestVersion in storageContext -> utils -> getTransforms()', async () => {
      const { ctx, savedObjectsClient, mSearchSpy } = setup();

      const requestVersion = 1;

      savedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 1,
        page: 1,
        per_page: 10,
      });

      await fn(ctx, {
        contentTypes: [{ contentTypeId: 'foo', version: 1 }],
        query: { text: 'Hello' },
      });

      const [{ ctx: storageContext }] = mSearchSpy.mock.calls?.[0][0];

      storageContext.utils.getTransforms({ 1: {} });

      expect(storageContextGetTransforms).toHaveBeenCalledWith(
        { 1: {} },
        requestVersion,
        expect.any(Object)
      );

      // We can still pass custom version
      storageContext.utils.getTransforms({ 1: {} }, 1234);

      expect(storageContextGetTransforms).toHaveBeenCalledWith({ 1: {} }, 1234, expect.any(Object));
    });

    describe('validation', () => {
      test('should validate that content type definition exist', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, {
            contentTypes: [{ contentTypeId: 'unknown', version: 1 }],
            query: { text: 'Hello' },
          })
        ).rejects.toEqual(new Error('Content [unknown] is not registered.'));
      });

      test('should throw if the request version is higher than the registered version', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, {
            contentTypes: [{ contentTypeId: 'foo', version: 7 }],
            query: { text: 'Hello' },
          })
        ).rejects.toEqual(new Error('Invalid version. Latest version is [2].'));
      });
    });
  });
});
