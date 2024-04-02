/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';

import type { ContentManagementServiceDefinitionVersioned } from '@kbn/object-versioning';
import { schema } from '@kbn/config-schema';
import { validate, disableTransformsCache } from '../../utils';
import { ContentRegistry } from '../../core/registry';
import { createMockedStorage } from '../../core/mocks';
import { EventBus } from '../../core/event_bus';
import { deleteProc } from './delete';

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

const { fn, schemas } = deleteProc;

const inputSchema = schemas?.in;
const outputSchema = schemas?.out;

if (!inputSchema) {
  throw new Error(`Input schema missing for [update] procedure.`);
}

if (!outputSchema) {
  throw new Error(`Output schema missing for [update] procedure.`);
}

const FOO_CONTENT_ID = 'foo';

describe('RPC -> delete()', () => {
  describe('Input/Output validation', () => {
    const validInput = { contentTypeId: 'foo', id: '123', version: 1 };

    test('should validate that a contentTypeId and an id is passed', () => {
      [
        { input: validInput },
        {
          input: omit(validInput, 'contentTypeId'),
          expectedError: '[contentTypeId]: expected value of type [string] but got [undefined]',
        },
        {
          input: { ...validInput, unknown: 'foo' },
          expectedError: '[unknown]: definition for this key is missing',
        },
        {
          input: { ...validInput, id: '' }, // id must have min 1 char
          expectedError: '[id]: value has length [0] but it must have a minimum length of [1].',
        },
        {
          input: omit(validInput, 'version'),
          expectedError: '[version]: expected value of type [number] but got [undefined]',
        },
        {
          input: { ...validInput, version: '1' }, // string number is OK
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
          version: 1,
          options: { any: 'object' },
        },
        inputSchema
      );

      expect(error).toBe(null);

      error = validate(
        {
          contentTypeId: 'foo',
          id: '123',
          version: 1,
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
          contentTypeId: 'foo',
          result: {
            success: true,
          },
        },
        outputSchema
      );

      expect(error).toBe(null);

      error = validate(123, outputSchema);

      expect(error?.message).toBe('expected a plain object value, but found [number] instead.');
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
          latest: 2,
        },
      });

      const requestHandlerContext = 'mockedRequestHandlerContext';
      const ctx: any = {
        contentRegistry,
        requestHandlerContext,
      };

      return { ctx, storage };
    };

    test('should return the storage delete() result', async () => {
      const { ctx, storage } = setup();

      const expected = { success: true };
      storage.delete.mockResolvedValueOnce(expected);

      const result = await fn(ctx, { contentTypeId: FOO_CONTENT_ID, version: 1, id: '1234' });

      expect(result).toEqual({
        contentTypeId: FOO_CONTENT_ID,
        result: expected,
      });

      expect(storage.delete).toHaveBeenCalledWith(
        {
          requestHandlerContext: ctx.requestHandlerContext,
          version: {
            request: 1,
            latest: 2, // from the registry
          },
          utils: {
            getTransforms: expect.any(Function),
          },
        },
        '1234',
        undefined
      );
    });

    test('should implicitly set the requestVersion in storageContext -> utils -> getTransforms()', async () => {
      const { ctx, storage } = setup();

      const requestVersion = 1;
      await fn(ctx, {
        contentTypeId: FOO_CONTENT_ID,
        id: '1234',
        version: requestVersion,
      });

      const [storageContext] = storage.delete.mock.calls[0];
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
        expect(() => fn(ctx, { contentTypeId: 'unknown', id: '1234' })).rejects.toEqual(
          new Error('Content [unknown] is not registered.')
        );
      });

      test('should throw if the request version is higher than the registered version', () => {
        const { ctx } = setup();
        expect(() =>
          fn(ctx, {
            contentTypeId: FOO_CONTENT_ID,
            id: '1234',
            version: 7,
          })
        ).rejects.toEqual(new Error('Invalid version. Latest version is [2].'));
      });
    });

    describe('object versioning', () => {
      test('should expose a  utility to transform and validate services objects', () => {
        const { ctx, storage } = setup();
        fn(ctx, { contentTypeId: FOO_CONTENT_ID, id: '1234', version: 1 });
        const [[storageContext]] = storage.delete.mock.calls;

        // getTransforms() utils should be available from context
        const { getTransforms } = storageContext.utils ?? {};
        expect(getTransforms).not.toBeUndefined();

        const definitions: ContentManagementServiceDefinitionVersioned = {
          1: {
            delete: {
              in: {
                options: {
                  schema: schema.object({
                    version1: schema.string(),
                  }),
                  up: (pre: object) => ({ ...pre, version2: 'added' }),
                },
              },
            },
          },
          2: {},
        };

        const transforms = getTransforms(definitions);

        // Some smoke tests for the getTransforms() utils. Complete test suite is inside
        // the package @kbn/object-versioning
        expect(transforms.delete.in.options.up({ version1: 'foo' }).value).toEqual({
          version1: 'foo',
          version2: 'added',
        });

        const optionsUpTransform = transforms.delete.in.options.up({ version1: 123 });

        expect(optionsUpTransform.value).toBe(null);
        expect(optionsUpTransform.error?.message).toBe(
          '[version1]: expected value of type [string] but got [number]'
        );

        expect(transforms.delete.in.options.validate({ version1: 123 })?.message).toBe(
          '[version1]: expected value of type [string] but got [number]'
        );
      });
    });
  });
});
